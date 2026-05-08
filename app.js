'use strict';

//Filen app.js är den enda ni skall och tillåts skriva kod i.

// Nedladdning av filer och middleware
const express=require('express');
const app=express();
const globalObject=require('./servermodules/game-modul.js'); 
const fs=require('fs');// Jag hittade inte denna mappen och alla andra mapper som vi behöver så kanske måste gå till labbhandling och fråga

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.post('/', (req, res) => {
    console.log(req.body);



    // Del 1
    try{
        const{nick_1, color_1}=req.body;

        if(nick_1===undefined){
            throw "Nickname saknas!";
        }

        if(color_1===undefined){
            throw "Färg saknas!";
        }

        if(nick_1.length < 3){
            throw "Nickname ska vara minst tre tecken långt!";
        }

        if(color_1.length !== 7){
            throw  "Färg ska innehålla sju tecken!";
        }

     const color1=color_1.toUpperCase();

        if(color1==="#FFFFFF" || color1==="#000000"){
            throw "Ogiltig färg!";
        }



        //Del 2

        if(globalObject.playerOneNick){
            if(globalObject.playerOneNick===nick_1){
                 throw "NickName redan taget";
            }
            
        }

        
        if(globalObject.playerOneColor){
            if(globalObject.playerOneColor===color1){
                throw "Färg redan tagen";
            }

        }


        if(globalObject.playerTwoNick){
            if(globalObject.playerTwoNick===nick_1){
                 throw "NickName redan taget";
            }

        }

        if(globalObject.playerTwoColor){
            if(globalObject.playerTwoColor===color1){
                throw "Färg redan tagen";
            }
        }


        // Här börjas del 3 Lycka till!!
        

        res.send("OK");

    } catch(error)
    {
        res.send(error);

    }



});

app.listen(3000);


