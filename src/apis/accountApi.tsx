import { User } from "../../src/models/User";
import { BASE_URL } from "./base_url";
import { Credentials } from "../../src/models/Credentials";
// Define types for the function parameters and return values

interface LoginResponse {
  access_token: string;
  user: User;
  // Add other fields returned by the login API
}

interface RegisterResponse {
  message: string;
  // Add other fields returned by the register API
}
const getToken = () => localStorage.getItem("access_token") || "";
const accountApi = {
  // Define the function type with parameters and return type
  async fetchCheckLogin(access_token: string){
    try {
      const response = await fetch(BASE_URL + "api/get-user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + access_token,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Kiểm tra nội dung phản hồi
      const text = await response.text();
      // Nếu phản hồi là JSON, parse nó
      return JSON.parse(text);
    } catch (error: any) {
      throw new Error(`Error fetching check login: ${error.message}`);
    }
  },
  async fetchLogin(credentials: Credentials): Promise<LoginResponse> {
    try {
      const response = await fetch(BASE_URL + "api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Kiểm tra nội dung phản hồi
      const text = await response.text();
      // Nếu phản hồi là JSON, parse nó
      return JSON.parse(text);
    } catch (error: any) {
      throw new Error(`Error fetching login: ${error.message}`);
    }
  },

  async fetchRegister(
    credentials: Credentials,
    userInformations: User
  ): Promise<RegisterResponse> {
    try {
      const response = await fetch(BASE_URL + "register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credentials, userInformations }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(`Error fetching register: ${error.message}`);
    }
  },

  async fetchLogout(access_token: string): Promise<string> {
    try {
      const response = await fetch(BASE_URL + "api/logout", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + access_token,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return "logout success";
    } catch (error: any) {
      throw new Error(`Error fetching logout: ${error.message}`);
    }
  },
  async fetchChangeUserInformations(
    access_token: string,
    user: User
  ): Promise<User> {
    try {
      const response = await fetch(BASE_URL + "api/update-user-information", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + access_token,
        },
        body: JSON.stringify(user),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      return JSON.parse(text);
    } catch (error: any) {
      throw new Error(`Error fetching logout: ${error.message}`);
    }
  },
  async fetchChangePassword(access_token: string,passwordCurrent:string, passwordNew:string): Promise<string> {
    try {
      const response = await fetch(BASE_URL + "api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + access_token,
        },
        body: JSON.stringify({passwordCurrent, passwordNew})
      });
      console.log(response.ok)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return "Change Password Success!";
    } catch (error: any) {
      throw new Error(`Error fetching logout: ${error.message}`);
    }
  },
};

export default accountApi;
