
module.exports = async function handler(req, res) {
  // Aceita apenas requisições POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "A chave do Gemini não foi configurada na Vercel."
      });
    }

    const {
      message,
      ideology,
      topic,
      history = []
    } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Envie uma mensagem válida."
      });
    }

    const positions = {
      "Esquerda radical": "esquerda radical",
      "Esquerda": "esquerda",
      "Centro-esquerda": "centro-esquerda",
      "Centro": "centro",
      "Centro-direita": "centro-direita",
      "Direita": "direita",
      "Direita radical": "direita radical"
    };

    const position = positions[ideology] || "centro";

    const systemInstruction = `
Você é um debatedor político de inteligência artificial
do projeto Ponto de Vista.

Sua posição ideológica é: ${position}.
O tema do debate é: ${topic || "política em geral"}.

REGRAS:
- Defenda sua posição ideológica com argumentos coerentes.
- Seja firme, inteligente e respeitoso.
- Use argumentos históricos, econômicos, sociais e políticos.
- Questione argumentos fracos do interlocutor.
- Reconheça quando um argumento contrário for válido.
- Não invente dados, pesquisas, estatísticas ou citações.
- Quando não souber um fato, admita a incerteza.
- Não trate opiniões políticas como fatos comprovados.
- Não incentive violência, perseguição ou discriminação.
- Responda em português brasileiro.
- Evite respostas genéricas: participe de um debate real.
`;

    const contents = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-12)) {
        if (
          item &&
          typeof item.text === "string" &&
          ["user", "model"].includes(item.role)
        ) {
          contents.push({
            role: item.role,
            parts: [{ text: item.text.slice(0, 4000) }]
          });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message.slice(0, 4000) }]
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Gemini:", data);

      return res.status(502).json({
        error: "O Gemini não conseguiu responder. Tente novamente."
      });
    }

    const answer =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      return res.status(502).json({
        error: "O Gemini retornou uma resposta vazia."
      });
    }

    return res.status(200).json({
      reply: answer
    });

  } catch (error) {
    console.error("Erro interno:", error);

    return res.status(500).json({
      error: "Erro interno ao conversar com a inteligência artificial."
    });
  }
};
