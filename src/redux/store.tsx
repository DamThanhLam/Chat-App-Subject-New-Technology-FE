import { configureStore } from "@reduxjs/toolkit";
import messageReducer from "./slices/MessageSlice";
import conversationReducer from "./slices/ConversationSlice";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import storage from "redux-persist/lib/storage"; // Local storage for web
import { combineReducers } from "redux";
import callReducer from "./slices/CallSlice";
import userReducer from "./slices/UserSlice";

const persistConfig = {
  key: "root",
  // Dùng storage phù hợp với môi trường: nếu có window (web) thì dùng localStorage, nếu không dùng AsyncStorage
  storage: typeof window !== "undefined" ? storage : AsyncStorage,
  whitelist: ["user"],
};

const rootReducer = combineReducers({
  user: userReducer,
  messages: messageReducer,
  conversation: conversationReducer,
  call: callReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
