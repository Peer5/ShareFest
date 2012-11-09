![Sharefest](https://raw.github.com/Peer5/ShareFest/master/public/img/logo.png)
One-To-Many sharing application. Serverless.
Eliminates the need to fully upload your file to services such as Dropbox or Google Drive.
Put your file and start sharing immidiately with anyone that enters the page.
Pure javascript-based, no plugins needed, thanks to HTML5 WebRTC Data Channel API - http://webrtc.org

How does it work
================
Sharefest operates on a mesh network similar to Bittorrent network.
The main difference is that currently the peers are coordinated using an intellegent server.
This coordinator controls what part are sent from A to B who shall talk with whom.
Peer5 Coordinator (or any other solution) is used to accomplish it.
Each peer will connect to few other peers in order to maximize the spread of the file.
Right now the first browser that support this is firefox - http://nightly.mozilla.org/

TODO:
=====
First version suppose to include a simple page that one user will drag a file to
share, and a second user will enter the first user's url and start getting the file.
* redirect to a dynamic url page
* create a cool drag-n-drop mechanism for the file uploader
* create a stand alone (non firefox) signaling server
* merge chat.js to index.html

History
=======
Started on SV DevFest 2012 hackathon in San Jose
