import React from "react";
import styles from "../styles/Board.module.css";
import Card from "./Card";
import { nanoid } from "nanoid";

export default function Board(props: {
  players: any;
  currentPlayer: any;
  cards: any;
  boardCard: any;
  socket: any;
}) {
  const colors: { [color: string]: string } = {
    red: "#eb5757",
    blue: "#4d55f0",
    yellow: "#f5b67a",
    green: "#27ae60",
  };

  return (
    <div className={styles.main}>
      <div className={styles.players}>
        {props.players.map((player: any) => (
          <div className={styles.playerContent} key={nanoid()}>
            <h4
              style={{
                color: props.currentPlayer == player.id ? "yellow" : "white",
              }}
            >
              {player.id == props.socket.id ? '~': ''} {player.username} ( {player.handSize} )
            </h4>
          </div>
        ))}
      </div>
      <div className={styles.cards}>
        <img
          src={props.boardCard.svg}
          alt=""
          className={styles.boardCard}
          style={{
            boxShadow: `0px 0px 20px ${
              props.boardCard.action == "wild" ||
              props.boardCard.action == "drawFour"
                ? colors[props.boardCard.color]
                : "transparent"
            }`,
            borderRadius: props.boardCard.action == "wild" ||
            props.boardCard.action == "drawFour"
              ? 20
              : 0,
            backgroundColor:
              props.boardCard.action == "wild" ||
              props.boardCard.action == "drawFour"
                ? colors[props.boardCard.color]
                : "transparent",
            padding:
              props.boardCard.action == "wild" ||
              props.boardCard.action == "drawFour"
                ? 10
                : 0,
          }}
        />
        <img
          className={styles.boardCard}
          style={{
            cursor: "pointer",
          }}
          src="/cards/back.svg"
          alt=""
          onClick={() => {
            props.socket.emit("drawCard");
          }}
        />
      </div>
      <div className={styles.board}>
        {props.cards.map((card: any) => (
          <Card card={card} key={nanoid()} socket={props.socket} />
        ))}
      </div>
    </div>
  );
}
