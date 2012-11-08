Sharefest
=========
One-To-Many sharing application.
Eliminates the need to fully upload your file to services such as Dropbox or GDrive.
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

History
=======
Started on SV DevFest 2012 hackathon in San Jose
