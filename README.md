# Background
This program was mostly made via ChatGPT. The goal was to create a simple QR scanning app for an orienteering game. Participants find controls and return to the home base between each control. I wanted to test out what ChatGPT could do as well as learn a bit about the different file types. More of a self project but feel free to alter! The QR scanning library used was [HTML5-qrcode](https://github.com/mebjas/html5-qrcode)

# Operation
User will be prompted to allow camera access permissions. User presses the "Scan" button to open a QR code scanner. The camera stays open for 20 seconds before closing. 
QR codes can be scanned in any order but it is intended for the user to scan "start" first. This will start a timer. Subsequent codes will add a row to the table with timestamp and lap time.
Codes placed on the controls can only be scanned once. "home" can be scanned multiple times. "finish" will stop the timer and present the total time between "start" and "finish". 
Data is stored locally and removed when clearing cookies/data from the browser. Data can be cleared manually by tapping the reset button 3 times.
