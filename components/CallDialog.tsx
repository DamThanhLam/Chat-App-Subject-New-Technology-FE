import { hideDialog } from "@/src/redux/slices/CallSlice";
import { RootState } from "@/src/redux/store";
import React from "react";
import { useSelector, useDispatch } from "react-redux";

const CallDialog = () => {
  const dispatch = useDispatch();
  const { from, offer, displayDialog } = useSelector((state: RootState) => state.call);

  if (!displayDialog) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        padding: 20,
        zIndex: 9999,
        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
      }}
    >
      <h3>Incoming Call</h3>
      <p>From: {from}</p>
      <button onClick={() => dispatch(hideDialog())}>Dismiss</button>
      <button
        onClick={() => {
          // TODO: accept call logic
          alert("Call accepted");
          dispatch(hideDialog());
        }}
      >
        Accept
      </button>
    </div>
  );
};

export default CallDialog;
