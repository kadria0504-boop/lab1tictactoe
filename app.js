"use strict";

//Filen app.js är den enda ni skall och tillåts skriva kod i.

// Nedladdning av filer och middleware
const express = require("express");
const app = express();
const globalObject = require("./servermodules/game-modul.js");
const fs = require("fs"); // Jag hittade inte denna mappen och alla andra mapper som vi behöver så kanske måste gå till labbhandling och fråga
const jsDom = require("jsdom").JSDOM;

//cookie parser/ del 3 installation av cookies
const cookieParser = require("cookie-parser");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// cookien igen
app.use(cookieParser());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/static/html/loggain.html");
});

app.post("/", (req, res) => {
  console.log(req.body);

  // Del 1
  try {
    const { nick_1, color_1 } = req.body;

    if (nick_1 === undefined) {
      throw new Error("Nickname saknas!");
    }

    if (color_1 === undefined) {
      throw new Error("Färg saknas!");
    }

    if (nick_1.length < 3) {
      throw new Error("Nickname ska vara minst tre tecken långt!");
    }

    if (color_1.length !== 7) {
      throw new Error("Färg ska innehålla sju tecken!");
    }

    const color1 = color_1.toUpperCase();

    if (color1 === "#FFFFFF" || color1 === "#000000") {
      throw new Error("Ogiltig färg!");
    }

    //Del 2

    if (globalObject.playerOneNick) {
      if (globalObject.playerOneNick === nick_1) {
        throw new Error("NickName redan taget");
      }
    }

    if (globalObject.playerOneColor) {
      if (globalObject.playerOneColor === color1) {
        throw new Error("Färg redan tagen");
      }
    }

    if (globalObject.playerTwoNick) {
      if (globalObject.playerTwoNick === nick_1) {
        throw new Error("NickName redan taget");
      }
    }

    if (globalObject.playerTwoColor) {
      if (globalObject.playerTwoColor === color1) {
        throw new Error("Färg redan tagen");
      }
    }

    // Här börjas del 3 Lycka till!!
    //tack Zack! :)

    res.cookie("nickName", nick_1, {
      //skapar kakan "nickName" fö nick_1
      maxAge: 60 * 1000 * 2 * 60, //livslängd 2 timmar
      httpOnly: true, // inte tillgänglig på js utan bara http
    });

    res.cookie("color", color_1, {
      //samma fast för color
      maxAge: 60 * 1000 * 2 * 60,
      httpOnly: true,
    });

    res.redirect("/"); //omdirigerar användaren till "/"
  } catch (error) {
    fs.readFile("./static/html/loggain.html", "utf8", (error2, html) => {
      if (error2) {
        res.send("Fel på filen");
      }
      const dom = new jsDom(html);
      const document = dom.window.document;

      document.querySelector("#errorMsg").textContent = error;

      if (req.body.nick_1) {
        document.querySelector("#nick_1").value = req.body.nick_1;
      }

      if (req.body.color_1) {
        document.querySelector("#color_1").value = req.body.color_1;
      }
      res.send(dom.serialize());

      // ser ni detta!!
    });
  }

  
}); // error fix- kadde lol

app.listen(3000, () => {
  console.log(`Server running on http://localhost:3000`);
});