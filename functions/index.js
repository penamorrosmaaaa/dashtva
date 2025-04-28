const {onRequest} = require("firebase-functions/v2/https");
const fetch = require("node-fetch");

// Replace with your real or fake token:
const HF_TOKEN = "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";

exports.huggingfaceProxy = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed: use POST");
  }
  try {
    const {prompt} = req.body;
    if (!prompt) {
      return res.status(400).send("Missing 'prompt' in request body");
    }
    const HF_MODEL_ENDPOINT = "https://api-inference.huggingface.co/models/bigscience/bloom-560m";
    const hfResponse = await fetch(HF_MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {max_new_tokens: 100},
      }),
    });
    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      return res.status(hfResponse.status).send(errText);
    }
    const data = await hfResponse.json();
    return res.json(data);
  } catch (error) {
    console.error("Error in huggingfaceProxy:", error);
    return res.status(500).send(error.toString());
  }
});
