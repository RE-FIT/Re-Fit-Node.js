const axios = require('axios');
const { chat, chatroom } = require('./schemas');

var admin = require('firebase-admin');

var serviceAccount = require('./firebaseConfig');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://refit-b8e5f.firebaseio.com"
});

const getFcm = async (otherId) => {
    try {
        const response = await axios.get("http://www.umc-refit.com/oauth2/fcm", {
            headers: {
                'otherId': encodeURIComponent(otherId)
            }
        });
        if (response.status === 200) {
            return {
                otherFcm: response.data.otherFcm
            };
        }
    } catch (error) {
        console.error('Failed to fetch FCM tokens:');
        return null;
    }
};

const sendNotificationToToken = async (fcmToken, title, body, roomId) => {
    const message = {
        notification: {
            title: title,
            body: body
        },
        data: {
            roomId: roomId
        },
        token: fcmToken
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

module.exports = (io) => {
    
    io.on('connection', (socket) => {
        console.log("connect success")
        
        //클라이언트가 joinRoom 이벤트를 보내면(즉 특정 방에 참여하면) 처리하는 핸들러
        //사용자가 특정 채팅방에 참여하려고할때 클라이언트에서 발생함, 이때 roomId와 userId를 매개변수로 전달
        socket.on('joinRoom', (roomId, userId) => {
            socket.join(roomId); //소켓을 roomId에 지정된 방에 조인
            socket.userId = userId; //사용자 ID를 소켓에 연결
            console.log(`User ${userId} joined room ${roomId}`);
        });

        //사용자가 메시지 보내면 일어나는 이벤트
        //사용자가 채팅 메시지를 보낼때 클라이언트에서 발생함, 이때 매개변수로 roomId, userId, message 전달
        socket.on('message', async (roomId, userId, otherId, message) => {
            console.log(`Message from user ${userId} in room ${roomId}: ${message}`);

            // 채팅방 참여자 확인 및 추가
            const room = await chatroom.findOne({ roomId: roomId });

            if (room) {
                if (!room.participants.includes(otherId)) {
                    room.participants.push(otherId);

                    // otherId가 buyer일 경우
                    if (otherId == room.buyer) {
                        room.buyer_enter = new Date();
                    }
                    // otherId가 seller일 경우
                    else if (otherId == room.seller) {
                        room.seller_enter = new Date();
                    }

                    await room.save();
                }
            } else {
                console.log(`Room ${roomId} does not exist`);
                return;
            }

            // 새로운 메시지 생성
            const newMessage = new chat({
                content: message,
                roomId: roomId,
                username: userId,
                time: new Date()
            });

            // 메시지 저장
            await newMessage.save(); //저장 메시지 생성

            const socketsInRoom = await io.in(roomId).allSockets(); //모든 소켓의 회원 ID 목록을 가지고 옴
            const isInRoom = Array.from(socketsInRoom).some(socketId => io.sockets.sockets.get(socketId).userId === otherId); // 해당 방에 otherId가 있는지 확인
            
            //만약 방에 있다면, 알림 전송
            if (!isInRoom) {
                const { otherFcm } = await getFcm(otherId); //fcm 토큰 정보 받아오기
            
                if (otherFcm) {
                    await sendNotificationToToken(otherFcm, userId, newMessage.content, roomId);
                } else {
                    console.error('No valid FCM token available');
                }
            }

            // 같은 채팅방에 있는 모든 클라이언트에게 메시지 전송
            io.to(roomId).emit('message', {
                content: newMessage.content,
                username: newMessage.username,
                time: newMessage.time,
            });
        });

        // 클라이언트가 방을 나갈 때 실행할 이벤트 핸들러
        socket.on('leaveRoom', async (roomId, userId) => {
            socket.leave(roomId);

            const room = await chatroom.findOne({ roomId: roomId });
            if (room) {
                if (userId === room.buyer) {
                    room.buyer_out = new Date();
                } else if (userId === room.seller) {
                    room.seller_out = new Date();
                }
                await room.save();
            }

            console.log(`User ${userId} left room ${roomId}`);
        });

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });
};
