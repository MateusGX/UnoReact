import React, { useState } from "react";
import styles from "../styles/Card.module.css";

export default function Card(props: { card: any; socket: any }) {
  let card = props.card;

  const [showColors, setShowColors] = useState(false);

  return (
    <div className={styles.card}>
      {(card.action == "wild" || card.action == "drawFour") && showColors ? (
        <div className={styles.colorSelect}>
          <div>
            <button
              onClick={() => {
                card.color = "red";
                props.socket.emit("playCard", props.card);
              }}
            >
              R
            </button>
            <button
              onClick={() => {
                card.color = "blue";
                props.socket.emit("playCard", props.card);
              }}
            >
              B
            </button>
          </div>
          <div>
            <button
              onClick={() => {
                card.color = "yellow";
                props.socket.emit("playCard", props.card);
              }}
            >
              Y
            </button>
            <button
              onClick={() => {
                card.color = "green";
                props.socket.emit("playCard", props.card);
              }}
            >
              G
            </button>
          </div>
          <button
            onClick={() => {
              setShowColors(false);
            }}
            className={styles.closeBtn}
          >
            CLOSE
          </button>
        </div>
      ) : (
        <></>
      )}

      <img
        src={card.svg}
        alt=""
        onClick={() => {
          if (card.action == "wild" || card.action == "drawFour") {
            setShowColors(true);
            return;
          }
          props.socket.emit("playCard", card);
        }}
      />
    </div>
  );
}
