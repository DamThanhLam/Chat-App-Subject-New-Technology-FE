import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Offer {
  sdp: any;
  type: string;
}

interface CallState {
  from: string;
  offer: Offer | null;
  displayDialog: boolean;
}

const initialState: CallState = {
  from: "",
  offer: null,
  displayDialog: false,
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    setCallOffer: (state, action: PayloadAction<{ from: string; offer: Offer }>) => {
      state.from = action.payload.from;
      state.offer = action.payload.offer;
      state.displayDialog = true;
    },
    hideDialog: (state) => {
      state.displayDialog = false;
      state.offer = null;
      state.from = "";
    },
  },
});

export const { setCallOffer, hideDialog } = callSlice.actions;
export default callSlice.reducer;
