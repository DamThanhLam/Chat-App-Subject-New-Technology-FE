import { createAsyncThunk, createSlice, current, PayloadAction } from "@reduxjs/toolkit";
import accountApi from "../../apis/accountApi";
import { deleteToken, saveToken } from "../../utils/storeKeychain";
import { User } from "@/app/models/User";
import { Credentials } from "@/app/models/Credentials";


const initialState: User = {
  id: "",
  name: "",
  phoneNumber: "",
  email: null,
};

const userSlice = createSlice({
  name: "authentication",
  initialState,
  reducers: {
    authenticationLog(state) {
      console.log(current(state));
    },
    setUser: (state,action:PayloadAction<User>)=>{
      return action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      Object.assign(state, action.payload);
    },
  },
});

export const { authenticationLog, setUser, updateUser } = userSlice.actions;
export default userSlice.reducer;
