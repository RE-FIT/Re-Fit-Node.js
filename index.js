const express = require('express');
const axios = require('axios');

//ENV
require('dotenv').config()

const app = express();
const port = process.env.PORT;

const resource_url = process.env.OAUTH_URL;  // 스프링 서버의 보호된 리소스 URL

//mongoose
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // 연결이 성공적으로 이루어졌을 때의 콜백
  console.log("Connected to MongoDB!");
});


/*oauth api*/
//Oauth2.0 연결 API
app.get('/oauth2', async (req, res) => {
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

/*chat room api*/
//채팅방 생성 API
app.get('/chat/room', async (req, res) => {
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