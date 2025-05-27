interface Message {
    id?: string; 
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: number;
  }
  
  const API_BASE_URL = "https://your-api-gateway.amazonaws.com"; // AWS API Gateway URL
  
  const MessengerAPI = {
    getAllMessages: async (chatId: string): Promise<Message[]> => {
      const url = `${API_BASE_URL}/messenger?chatId=${chatId}`;
  
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
  
      return response.json();
    },
  
    postMessage: async (chatId: string, message: Message): Promise<Message> => {
      const url = `${API_BASE_URL}/messenger/send`;
  
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId, ...message }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
  
      return response.json();
    },
  };
  
  export default MessengerAPI;
  