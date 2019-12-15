# Express Trivia   
## An ExpressJS web app to host and play trivia games with friends over the internet.
## Hosted at [trivia.kvanland.com](http://trivia.kvanland.com)

* Host games with uniquely generated game codes
* Quickly set up a game and start playing in seconds
* No limit on the number of players per game
* All questions sourced from [jService](http://jservice.io/)

## Installation
### If you want to build this without docker
Use npm to install the dependencies listed in package.json
```bash
npm install
```

### If you want to build this with docker
Build the docker image
```bash
docker build -t expresstrivia .
```

## Usage
### If you want to run this without docker

Run the application it should be running on port 3000 by default 
```bash
node public/app.js
```

### If you want to run this with docker
Run the docker image and expose the 3000 port

If you're running this on a server and want to access the web app from the internet
```bash
docker run -p 80:3000 -d expresstrivia
```

If you're just running the web app locally
```bash
docker run -p [your specified port]:3000 -d expresstrivia
```