import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper to initialize Gemini SDK safely
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // API: Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  // API: Gemini Risk Score Analysis
  app.post('/api/gemini/analyze-risk', async (req, res) => {
    try {
      const { clients } = req.body;
      if (!Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ error: 'Nenhum registro de devedor fornecido para análise.' });
      }

      // Limit to 25 items per request for fast response
      const targetBatch = clients.slice(0, 25);
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback calculation if GEMINI_API_KEY is not configured yet
        const fallbackResults = targetBatch.map(c => {
          const days = c.diasAtraso || 30;
          let score = Math.min(95, Math.max(15, Math.round((days / 360) * 80 + (c.status === 'sem_contato' ? 25 : 0) - (c.status === 'acordo_fechado' ? 30 : 0))));
          let nivel: 'BAIXO' | 'MÉDIO' | 'ALTO' | 'CRÍTICO' = 'MÉDIO';
          let prob: 'ALTA' | 'MÉDIA' | 'BAIXA' = 'MÉDIA';
          let percentual = 60;

          if (score >= 75 || days > 180) {
            nivel = 'CRÍTICO';
            prob = 'BAIXA';
            percentual = Math.max(10, 100 - score);
          } else if (score >= 50) {
            nivel = 'ALTO';
            prob = 'BAIXA';
            percentual = 35;
          } else if (score >= 30) {
            nivel = 'MÉDIO';
            prob = 'MÉDIA';
            percentual = 65;
          } else {
            nivel = 'BAIXO';
            prob = 'ALTA';
            percentual = 88;
          }

          return {
            id: c.id,
            matricula: c.matricula,
            cliente: c.cliente,
            score,
            nivelRisco: nivel,
            probabilidadeRecuperacao: prob,
            percentualRecuperacao: percentual,
            estrategiaSugerida: days > 180 
              ? 'Notificação formal com proposta de desconto para quitação à vista ou parcelamento em até 4x.'
              : 'Contato direto via WhatsApp reforçando facilidade de PIX e mantendo o vencimento original.',
            justificativa: `Calculado com base no tempo de atraso (${days} dias) e histórico registrado (${c.informacao || 'Sem anotações restritivas'}).`,
            dataAnalise: new Date().toLocaleDateString('pt-BR')
          };
        });

        return res.json({ 
          success: true, 
          results: fallbackResults, 
          source: 'heuristic',
          note: 'Análise heurística executada. Chave GEMINI_API_KEY pode ser configurada em Settings > Secrets.' 
        });
      }

      // Prepare prompt for Gemini
      const prompt = `Você é um analista especialista em cobrança e recuperação de crédito da Valora Gestão & Finanças.
Analise a lista a seguir de clientes inadimplentes e gere para cada um:
1. "score": número inteiro de 0 a 100 indicando o risco de não pagamento (0 = risco mínimo, 100 = risco quase irrecuperável).
2. "nivelRisco": uma das opções: "BAIXO", "MÉDIO", "ALTO", "CRÍTICO".
3. "probabilidadeRecuperacao": uma das opções: "ALTA", "MÉDIA", "BAIXA".
4. "percentualRecuperacao": número inteiro de 0 a 100 indicando a probabilidade estimada de recuperar a dívida.
5. "estrategiaSugerida": texto curto em português com recomendação prática de negociação (ex: parcelamento, desconto à vista, ligação no dia do pagamento, envio de boleto).
6. "justificativa": breve explicação do score considerando dias de atraso, anotações de contato e acordos.

Dados dos clientes para análise:
${JSON.stringify(targetBatch, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Retorne estritamente um array JSON com as análises detalhadas de cada cliente, mantendo o id e matrícula correspondentes.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                matricula: { type: Type.STRING },
                cliente: { type: Type.STRING },
                score: { type: Type.INTEGER },
                nivelRisco: { type: Type.STRING },
                probabilidadeRecuperacao: { type: Type.STRING },
                percentualRecuperacao: { type: Type.INTEGER },
                estrategiaSugerida: { type: Type.STRING },
                justificativa: { type: Type.STRING },
              },
              required: [
                'id', 
                'matricula', 
                'cliente', 
                'score', 
                'nivelRisco', 
                'probabilidadeRecuperacao', 
                'percentualRecuperacao', 
                'estrategiaSugerida', 
                'justificativa'
              ]
            }
          }
        }
      });

      const responseText = response.text?.trim() || '[]';
      let parsedData = [];
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Failed to parse Gemini JSON output', parseErr, responseText);
        throw parseErr;
      }

      const todayStr = new Date().toLocaleDateString('pt-BR');
      const formatted = parsedData.map((item: any) => ({
        ...item,
        dataAnalise: todayStr,
      }));

      return res.json({
        success: true,
        results: formatted,
        source: 'gemini-3.8-flash'
      });

    } catch (err: any) {
      console.error('Error in /api/gemini/analyze-risk:', err);
      return res.status(500).json({ 
        error: 'Erro ao processar análise preditiva de crédito via Gemini.',
        details: err?.message || String(err)
      });
    }
  });

  // API: Gemini Response Suggestion (Sales argument for collection negotiation)
  app.post('/api/gemini/suggest-response', async (req, res) => {
    try {
      const { 
        cliente, 
        matricula, 
        responsavel = 'Cobrança', 
        diasAtraso = 30, 
        status = 'pendente', 
        canal = 'whatsapp',
        valorOriginal, 
        valorAcordo, 
        informacao,
        historicoContatos = [] 
      } = req.body;

      if (!cliente) {
        return res.status(400).json({ error: 'Dados do cliente são obrigatórios para sugerir resposta.' });
      }

      const ai = getGeminiClient();

      if (!ai) {
        // Fallback intelligent calculation if GEMINI_API_KEY is not configured
        const primeiroNome = cliente.split(' ')[0] || cliente;
        let argumento = 'Facilidade de liquidação e liberação imediata de crédito para novas compras';
        let tom = 'Empático e resolutivo';
        let gatilho = 'Preservação de crédito e solução facilitada';
        let proximoPasso = 'Apresentar proposta de parcelamento com entrada acessível e fixar prazo de retorno hoje';
        let texto = `Olá, ${primeiroNome}! Tudo bem? Aqui é ${responsavel} da Valora Gestão & Finanças. Identificamos a pendência da sua matrícula #${matricula} e temos uma condição especial autorizada para regularizar hoje com flexibilidade no parcelamento e liberação do seu cadastro. Como podemos ajustar o pagamento para ficar confortável para você?`;

        if (diasAtraso > 90) {
          argumento = 'Evitar encaminhamento para negativação e redução de encargos para acordo imediato';
          tom = 'Firme e colaborativo';
          gatilho = 'Urgência e proteção do CPF';
          proximoPasso = 'Propor entrada reduzida e envio de boleto ou chave Pix com vencimento em 24h';
          texto = `Olá, ${primeiroNome}. Entramos em contato em caráter prioritário sobre a sua conta pendente (#${matricula}). Nosso objetivo é evitar o bloqueio definitivo do seu cadastro e custas adicionais. Conseguimos uma autorização excepcional para quitação com desconto ou entrada mínima. Podemos fechar essa regularização hoje?`;
        } else if (status === 'em_negociacao') {
          argumento = 'Formalização das condições conversadas para envio de boleto ou Pix';
          tom = 'Pró-ativo e conclusivo';
          gatilho = 'Compromisso e facilidade';
          proximoPasso = 'Confirmar data e valor da primeira parcela para emissão imediata';
          texto = `Olá, ${primeiroNome}! Conforme conversamos anteriormente, reservei as condições especiais para a quitação da sua pendência (#${matricula}). Para garantir essa oportunidade e emitir seu comprovante, você prefere boleto bancário ou Pix?`;
        }

        return res.json({
          success: true,
          source: 'local-expert-rules',
          suggestion: {
            sugestaoTexto: texto,
            argumentoVenda: argumento,
            proximoPassoRecomendado: proximoPasso,
            tomAbordagem: tom,
            gatilhoPsicologico: gatilho,
          }
        });
      }

      // Gemini AI Prompt
      const lastContactsSummary = Array.isArray(historicoContatos) && historicoContatos.length > 0
        ? historicoContatos.slice(0, 5).map((c: any, i: number) => 
            `- [${c.dataHora || 'Contato anterior'}] (${c.canal || 'canal'}, resultado: ${c.tipoResultado || 'contato'}): ${c.resumo || ''} ${c.detalhes || ''}`
          ).join('\n')
        : 'Nenhum histórico anterior registrado.';

      const prompt = `Você é um especialista em negociação, cobrança humanizada e técnicas de vendas da empresa "Valora Gestão & Finanças".
Sua tarefa é analisar o histórico do cliente e propor a MELHOR abordagem (argumento de venda) para a próxima etapa da cobrança, transformando a cobrança em uma oportunidade de fechar acordo amigável e restabelecer o poder de compra do cliente.

DADOS DO CLIENTE:
- Nome: ${cliente}
- Matrícula: #${matricula}
- Cobrador(a) Responsável: ${responsavel}
- Dias em Atraso: ${diasAtraso} dias
- Status Atual: ${status}
- Canal de Envio: ${canal}
- Valor Original: ${valorOriginal ? `R$ ${valorOriginal}` : 'Não especificado'}
- Valor Acordo Atual: ${valorAcordo ? `R$ ${valorAcordo}` : 'Não especificado'}
- Notas da Ficha: ${informacao || 'Nenhuma'}

HISTÓRICO RECENTE DE INTERAÇÕES:
${lastContactsSummary}

DIRETRIZES DE COMUNICAÇÃO:
1. Comece saudando pelo primeiro nome do cliente de forma calorosa e profissional.
2. Não seja agressivo ou ameaçador. Utilize técnicas de persuasão de vendas (como foco na solução, preservação do bom relacionamento, liberação de limite para compras, desconto em juros ou parcelamento flexível).
3. Seja claro e direto quanto à ação requerida (Call-to-Action).
4. O texto deve ser natural e pronto para envio via ${canal === 'whatsapp' ? 'WhatsApp' : 'telefone/e-mail'}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sugestaoTexto: { type: Type.STRING },
              argumentoVenda: { type: Type.STRING },
              proximoPassoRecomendado: { type: Type.STRING },
              tomAbordagem: { type: Type.STRING },
              gatilhoPsicologico: { type: Type.STRING },
            },
            required: [
              'sugestaoTexto', 
              'argumentoVenda', 
              'proximoPassoRecomendado', 
              'tomAbordagem', 
              'gatilhoPsicologico'
            ]
          }
        }
      });

      const responseText = response.text?.trim() || '{}';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Gemini JSON response for suggestion:', e, responseText);
        parsedData = {
          sugestaoTexto: responseText,
          argumentoVenda: 'Flexibilização de pagamento e quitação facilitada',
          proximoPassoRecomendado: 'Enviar mensagem e aguardar posicionamento',
          tomAbordagem: 'Empático e profissional',
          gatilhoPsicologico: 'Reciprocidade',
        };
      }

      return res.json({
        success: true,
        source: 'gemini-3.8-flash',
        suggestion: parsedData,
      });

    } catch (err: any) {
      console.error('Error in /api/gemini/suggest-response:', err);
      return res.status(500).json({ 
        error: 'Erro ao gerar sugestão de resposta via Gemini.',
        details: err?.message || String(err)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
