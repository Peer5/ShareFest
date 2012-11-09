Sharefest
=========

One-To-Many sharing application. Put your file and start sharing with anyone that enters the page.
Sharefest will use a mesh network which is created on the server by Peer5 SaaS (or any other server)
Each peer will connect to few other peers in order to maximize the spread of the file.
Current implementation has no decision making in term of which peers to connect to and what to send

Started on SV DevFest 2012 hackathon in San Jose.
This hack is about using the latest and HTML WebRTC Data Channel API - http://webrtc.org
Right now the first browser that support this is firefox - http://nightly.mozilla.org/

ToDo:
=====
First version suppose to include a simple page that one user will drag a file to
share, and a second user will enter the first user's url and start getting the file.
*redirect to a dynamic url page
*create a cool drag-n-drop mechanism for the file uploader
*create a stand alone (non firefox) signaling server
*merge chat.js to index.html

History
=======
Started on SV DevFest 2012 hackathon in San Jose
