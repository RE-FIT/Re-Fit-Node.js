const express = require('express');
const axios = require('axios');

//ENV
require('dotenv').config()

const app = express();
const port = process.env.PORT;

const resource_url = process.env.OAUTH_URL;  // 스프링 서버의 보호된 리소스 URL

/*dialog api*/
app.get('/dialog', async (req, res) => {
  const token = req.headers.authorization;  // 헤더에서 액세스 토큰 추출
  
  //리소스에 접급
  try {
    const response = await axios.get(resource_url, {
      headers: {
        'Authorization': `${token}`
      }
    });

    // 응답 전송
    const data = response.data;
    
    res.send(response.data);
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
});
