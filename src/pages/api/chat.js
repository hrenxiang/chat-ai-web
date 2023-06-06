// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({message: 'Method should is POST!'});
  } else {
    try {
      const url = "https://api.openai.com/v1/chat/completions";
      const header = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
      };

      const response = await axios.post(url, req.body, {headers: header, timeout: 10000});
      res.status(200).json(response)
    } catch (error) {
      console.log(error);
      res.status(500).json({message: "Something went wrong!"})
    }
  }
}
