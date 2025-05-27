import { User } from "@/src/models/User";
import { createSlice, current, PayloadAction } from "@reduxjs/toolkit";


const initialState: User = {
  id: "",
  name: "",
  phoneNumber: "",
  email: null,
  avatarUrl:""
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
