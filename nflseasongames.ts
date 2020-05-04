import fs = require("fs");
import csv = require("fast-csv");
import Sync = require("Sync");
import Fiber = require("fibers");

let curYear : number = 0;
let numGames : number = 0;
let numTeams : number = 0;
let teams = new Array<nflTeam>();
let games = new Array<nflGame>();

function sleep(ms) {
    let fiber = Fiber.current;
    setTimeout(function() {
        fiber.run();
    }, ms);
    Fiber.yield();
}

///////////////////////////////////////////
// nflTeam
// Models an nfl team
// name, conference, and division
///////////////////////////////////////////

class nflTeam {
   name : string;
   conference : string;
   division : string;
   finishPlace : number;

   constructor (name : string,conference : string,division : string,finishPlace : number) {
      this.name = name.toLowerCase();
      this.conference = conference.toLowerCase();
      this.division = division.toLowerCase();
      this.finishPlace = finishPlace;
   }

   getInfo() {
      return this.name + ' in ' + this.conference + '.' + this.division + " finishPlace: " + this.finishPlace;
   }
}

// find function
// passed "this" is a team name string
function teamMatch(team) {
   return team.name == this;
}

function processTeamCsvLine(data){
   let team : nflTeam = new nflTeam(data[0],data[1],data[2],data[3]);
   //console.log(team.getInfo());
   teams.push(team);
   numTeams++;
}

function endTeamsCsvFile(data){
   //console.log('Read finished');
   //console.log('numTeams is ' + numTeams);
   console.log('teams.length is ' + teams.length)
}

// end nflTeam //

///////////////////////////////////////////
// nflGame
// Models an nfl game matchup
// homeTeam, awayTeam : object references, not just names
///////////////////////////////////////////

class nflGame {
   homeTeam : nflTeam;
   awayTeam : nflTeam;

   constructor (homeTeamName,awayTeamName) {
      let homeTeam : nflTeam = teams.find(teamMatch,homeTeamName);
      let awayTeam : nflTeam = teams.find(teamMatch,awayTeamName);
      this.homeTeam = homeTeam;
      this.awayTeam = awayTeam;
   }

   getInfo() {
      return this.homeTeam.name + ' vs ' + this.awayTeam.name;
   }
}

// find function
// passed "this" is another game
function gameMatch(g) {
  return (g.homeTeam === this.homeTeam && g.awayTeam === this.awayTeam);
}

function processGameCsvLine(data){
   if (data[1].toLowerCase() == 'bye') {
      return;
   }

   let game : nflGame = new nflGame(data[0].toLowerCase(),data[1].toLowerCase());
   games.push(game);
   numGames++;
}

function endGamesCsvFile(data){
   //console.log('Read finished');
   //console.log('numGames is ' + numGames);
   console.log('games.length is ' + games.length)
}

// end nflGame //

///////////////////////////////////////////
// nflDivisionMatchup
// Models a divisional matchup (1 division vs another division)
// and models the games in that matchup
// conference1, division1
// conference1, division1
// games collection
///////////////////////////////////////////

class nflDivisionMatchup {
   conference1 : string;
   division1 : string;
   conference2 : string;
   division2 : string;
   games : Array<nflGame>;

   constructor (team1 : nflTeam, team2 : nflTeam) {
      this.conference1 = team1.conference;
      this.division1 = team1.division;
      this.conference2 = team2.conference;
      this.division2 = team2.division;
      this.games = new Array<nflGame>();
   }

   getInfo() {
      return this.conference1 + '.' + this.division1 + ' vs ' + 
             this.conference2 + '.' + this.division2 + ' games: ' + this.games.length;
   }
}

// find functions
// passed "this" is an nflGame
function divisionMatchUpMatchByGame(divMU) {
   let divMU_confDiv1 : string = divMU.conference1 + "." + divMU.division1;
   let divMU_confDiv2 : string = divMU.conference2 + "." + divMU.division2;
   let game_confDivHome : string = this.homeTeam.conference + "." + this.homeTeam.division;
   let game_confDivAway : string = this.awayTeam.conference + "." + this.awayTeam.division;

   return (divMU_confDiv1 == game_confDivHome && divMU_confDiv2 == game_confDivAway) ||
          (divMU_confDiv1 == game_confDivAway && divMU_confDiv2 == game_confDivHome);
}

function divisionMatchUpMatchByPlacementHistory(divMU) {
   let divMU_confDiv1 : string = divMU.conference1 + "." + divMU.division1;
   let divMU_confDiv2 : string = divMU.conference2 + "." + divMU.division2;
   let history_confDiv1 : string = this.conference + "." + this.division1;
   let history_confDiv2 : string = this.conference + "." + this.division2;

   return (divMU_confDiv1 == history_confDiv1 && divMU_confDiv2 == history_confDiv2) ||
          (divMU_confDiv1 == history_confDiv2 && divMU_confDiv2 == history_confDiv1);
}
// end nflDivisionMatchup //

///////////////////////////////////////////
// nflSeasonMatchups
// Models a seasons worth of games categorized into collections of nflDivisionMatchup (s)
// Provides organized history of the past 4 seasons necessary to produce the next seasons set of games
// divisionMatchups
// intraConferenceMatchups
// interConferenceMatchups
// intraConferenceFinishPlaceMatchups
///////////////////////////////////////////

class nflSeasonMatchups {

   year : number;
   divisionMatchups : Array<nflDivisionMatchup>;
   intraConferenceMatchups : Array<nflDivisionMatchup>;
   intraConferenceFinishPlaceMatchups : Array<nflDivisionMatchup>;
   interConferenceMatchups : Array<nflDivisionMatchup>;

   constructor (year : number) {
      this.year = year;
      this.divisionMatchups = new Array<nflDivisionMatchup>();
      this.intraConferenceMatchups = new Array<nflDivisionMatchup>();
      this.intraConferenceFinishPlaceMatchups = new Array<nflDivisionMatchup>();
      this.interConferenceMatchups = new Array<nflDivisionMatchup>();
   }
  
   getInfo() {
      return this.year + " divisionMatchups: " + this.divisionMatchups.length + 
                         " intraConferenceMatchups: " + this.intraConferenceMatchups.length + 
                         " intraConferenceFinishPlaceMatchups: " + this.intraConferenceFinishPlaceMatchups.length + 
                         " interConferenceMatchups: " + this.interConferenceMatchups.length;
   }

   logSummary() {
      console.log("DivisionMatchUps for season: " + this.year);
      logDivMatchUpsSummary("Division Level Matchups", this.divisionMatchups);
      logDivMatchUpsSummary("Intra Conference Matchups", this.intraConferenceMatchups);
      logDivMatchUpsSummary("Intra Conference Finish Place Matchups", this.intraConferenceFinishPlaceMatchups);
      logDivMatchUpsSummary("Inter Conference Matchups", this.interConferenceMatchups);
    }
}

function logDivMatchUpsSummary(matchUpsDescr : string, dmus : Array<nflDivisionMatchup>) {
   console.log(matchUpsDescr);
   let dmu : nflDivisionMatchup;
   for (dmu of dmus) {
      console.log("   " + dmu.conference1 + "." + dmu.division1 + " vs " + dmu.conference2 + "." + dmu.division2 + " -> games: " + dmu.games.length);
   }
}

// seasonMatch: array find function
//    seasonMatchups represents the array element being checked as a "find" candidate
//    optional index: the array index of seasonMatchups array element 
//    optional arr:   the array being searched
//    optional this:  passed as the 2nd argument to find, to be used in comparing and checking the array element
// passed "this" is numeric year
function seasonMatch(seasonMatchups) {
   return seasonMatchups.year == this;
}

// end nflSeasonMatchups //

///////////////////////////////////////////
// nflseasons array ///////////////////////
// Previous seasons games categorized into nflSeasonMatchups objects
// Input data necessary to generate the next seasons games
///////////////////////////////////////////

let nflseasons = new Array<nflSeasonMatchups>();

//////////////////////////////
// createPriorSeasonMatchups - read in prior seasons and sort games into different matchup categories
//////////////////////////////

function createPriorSeasonMatchups(gameFileName : string, year : number, nflseasons : Array<nflSeasonMatchups>) {
   games = new Array<nflGame>();
   fs.createReadStream(gameFileName).pipe(csv())
                                    .on('data',processGameCsvLine)
                                    .on('end',endGamesCsvFile);
   sleep(100);
 
   let priorSeasonMatchups = new nflSeasonMatchups(year);
   nflseasons.push(priorSeasonMatchups);

   // loop through games and distribute into curSeasonMatchups

   let game : nflGame;
   for (game of games) {
      let homeTeam : nflTeam = game.homeTeam;
      let awayTeam : nflTeam = game.awayTeam;
      //console.log("createPriorSeasonMatchups game homeTeam: " + game.homeTeam + " awayTeam: " + game.awayTeam);
      //console.log("createPriorSeasonMatchups found homeTeam: " + homeTeam.name + " awayTeam: " + awayTeam.name);

      // determine if divisional game
      if (homeTeam.conference == awayTeam.conference) {
         if (homeTeam.division == awayTeam.division) {
         	// divisional matchup
         	let divisionMatchup : nflDivisionMatchup = priorSeasonMatchups.divisionMatchups.find(divisionMatchUpMatchByGame,game);
         	if (divisionMatchup === undefined) {
         		divisionMatchup = new nflDivisionMatchup(homeTeam,awayTeam);
         		priorSeasonMatchups.divisionMatchups.push(divisionMatchup);
         	}
         	divisionMatchup.games.push(game);
         }
         else {
         	// intraConference matchup
          	let divisionMatchup : nflDivisionMatchup = priorSeasonMatchups.intraConferenceMatchups.find(divisionMatchUpMatchByGame,game);
         	if (divisionMatchup === undefined) {
               divisionMatchup = new nflDivisionMatchup(homeTeam,awayTeam);
               priorSeasonMatchups.intraConferenceMatchups.push(divisionMatchup);
        	}
          	divisionMatchup.games.push(game);
         }
      }
      else {
         // interConference matchup
         let divisionMatchup : nflDivisionMatchup = priorSeasonMatchups.interConferenceMatchups.find(divisionMatchUpMatchByGame,game);
         if (divisionMatchup === undefined) {
            divisionMatchup = new nflDivisionMatchup(homeTeam,awayTeam);
            priorSeasonMatchups.interConferenceMatchups.push(divisionMatchup);
         }
         divisionMatchup.games.push(game);
      }
   }

   //console.log(priorSeasonMatchups.getInfo());
   // post process the division matchups for primary intraconference matchups vs finishplace intraconference
   let primaryIntraConferenceMatchups = new Array<nflDivisionMatchup>();

   //console.log("priorSeasonMatchups.intraConferenceMatchups");

   let intraConfDivMU : nflDivisionMatchup;
   for (intraConfDivMU of priorSeasonMatchups.intraConferenceMatchups) {
      //console.log(intraConfDivMU);
      if (intraConfDivMU.games.length == 4) {
         // this is a set of intra-conference placement matchups - move to that collection
         // TBD: could analyze for Home vs Away - all 4 games should have the same home/away at div level
         priorSeasonMatchups.intraConferenceFinishPlaceMatchups.push(intraConfDivMU);
      }
      else {
         primaryIntraConferenceMatchups.push(intraConfDivMU);
      }
   }
   priorSeasonMatchups.intraConferenceMatchups.length = 0;
   priorSeasonMatchups.intraConferenceMatchups = primaryIntraConferenceMatchups;
   //console.log(priorSeasonMatchups.getInfo());
   
   priorSeasonMatchups.logSummary();
}

/////////////////////
// Deep copy function
/////////////////////

function copy(o) {
   let output, v, key;
   output = Array.isArray(o) ? [] : {};
   for (key in o) {
       v = o[key];
       output[key] = (typeof v === "object") ? copy(v) : v;
   }
   return output;
}

// Utility function for replacing a character within a string
function setCharAt(str : string,index : number,chr : string) {
   if(index > str.length-1) return str;
   return str.substr(0,index) + chr + str.substr(index+1);
}

function createIntraConferenceMatchups(nflseasons : Array<nflSeasonMatchups>, curSeasonMatchups : nflSeasonMatchups) {
   // extract previous season from nflseasons - using find
   // copy all the intraconference games from the priorSeason into the curSeason
   // Make deep copies - not just pointer copies
   // Then switch the home and away teams from the priorseason

   let priorSeasonYear : number = curSeasonMatchups.year - 3;
   let priorSeasonMatchups : nflSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: createIntraConferenceMatchups: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   curSeasonMatchups.intraConferenceMatchups = copy(priorSeasonMatchups.intraConferenceMatchups);
   //console.log(" Dumping IntraConference matchups");

   let icmu : nflDivisionMatchup;
   for (icmu of curSeasonMatchups.intraConferenceMatchups) {
      //console.log(icmu.getInfo());
      let icGame : nflGame;
      for (icGame of icmu.games) {
         let homeTeam = icGame.homeTeam;
         let awayTeam = icGame.awayTeam;
         // swap home and away from 3 years ago
         icGame.homeTeam = awayTeam;
         icGame.awayTeam = homeTeam;
         //console.log(icGame.getInfo());
      }
   }
}

function createIntraConferenceFinishPlaceMatchups(nflseasons : Array<nflSeasonMatchups>, curSeasonMatchups : nflSeasonMatchups) {

   // First copy intra conference finish place matchups from 3 years ago into this years instance
   // because the division matchups will repeat - even though the team match ups will vary
   // because of finish place differences

   let priorSeasonYear : number = curSeasonMatchups.year - 3;
   let priorSeasonMatchups : nflSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: createIntraConferenceFinishPlaceMatchups: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   // This years finish place division matchups are same as 3 years ago (in priorSeasonMatchups)
   // Copy finish place division matchups from 3 years ago
   curSeasonMatchups.intraConferenceFinishPlaceMatchups = copy(priorSeasonMatchups.intraConferenceFinishPlaceMatchups);
 
   // There are 8 intraConference Finish Place division matchups (4 for each conference)
   // For each intraConference Finish Place division Matchup (e.g. AFC West vs AFC East)
   // Analyze the games (which are from 3 years ago)
   // Swap the home team from that previous 3 year matchup
   // Check the first game (from 3 years ago)
   // Make the away team division1 from the first game (to become cur year home team)
   // Make the home team division2 from the first game (to become cur year away team)
   // continue on to the next intraConference Finish Place division Matchup

   // then can clear out the old games 
   // proceed to find the division matchup teams and sort the team finishes
   // and then create the games so that division1 is home and division2 is away

   let icfpms = curSeasonMatchups.intraConferenceFinishPlaceMatchups;  // 8 total matchups - I think 4 matchups - check
   let icfpm : nflDivisionMatchup;
   for (icfpm of icfpms) {
      let icfpGame : nflGame;
      for (icfpGame of icfpm.games) {
         let homeTeam : nflTeam = icfpGame.homeTeam;
         let awayTeam : nflTeam = icfpGame.awayTeam;

         // swap home division and away division from the 3 years ago
         icfpm.division1 = awayTeam.division; 
         icfpm.division2 = homeTeam.division;
         break;    // done swapping home/away - now create new games
      }
      // clear the games array from the old historical games
      // we'll be adding new games with last seasons finish places and swapped home and away

      icfpm.games = [];  
      
      let divPlacementTeams : Array<nflTeam> = teams.filter(finalPlacementTeamFilter, icfpm);
      divPlacementTeams.sort(finalPlacementTeamSort);

      let gameCount : number = divPlacementTeams.length/2;

      for (let gi : number = 0; gi < gameCount; gi++) {
         let team1 : nflTeam = divPlacementTeams[gi*2];
         let team2 : nflTeam = divPlacementTeams[gi*2 + 1];

         let game : nflGame;
         if (team1.division == icfpm.division1) {
            game = new nflGame(team1.name, team2.name);
         }
         else {
            game = new nflGame(team2.name, team1.name);
         }
         icfpm.games.push(game);
      }
   } 
}

function finalPlacementTeamFilter(team : nflTeam) {
   // this is nflDivisionMatchup for a finish place matchup division
   if (team.conference == this.conference1 && (team.division == this.division1 || team.division == this.division2)) {
      return true;
   }

   return false;
}

function finalPlacementTeamSort(team1 : nflTeam, team2 : nflTeam) {
   if (team1.finishPlace < team2.finishPlace) {
     return -1;
   }
   else if (team1.finishPlace > team2.finishPlace) {
      return 1;
   }
   else if (team1.division < team1.division) {
      return -1;
   }
   
   return 1;
}

function createInterConferenceMatchups(nflseasons : Array<nflSeasonMatchups>, curSeasonMatchups : nflSeasonMatchups) {
   // extract previous season from nflseasons - using find
   // copy all the interconference games from the priorSeason into the curSeason
   // Make deep copies - not just pointer copies
   // Then switch the home and away teams from the priorseason

   let priorSeasonYear : number = curSeasonMatchups.year - 4;
   let priorSeasonMatchups  : nflSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: createInterConferenceMatchups: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   curSeasonMatchups.interConferenceMatchups = copy(priorSeasonMatchups.interConferenceMatchups);
   //console.log(" Dumping InterConference matchups");

   let icmu : nflDivisionMatchup;
   for (icmu of curSeasonMatchups.interConferenceMatchups) {
      //console.log(icmu.getInfo());

      let icGame : nflGame;
      for (icGame of icmu.games) {
         let homeTeam = icGame.homeTeam;
         let awayTeam = icGame.awayTeam;
         // swap home and away from 3 years ago
         icGame.homeTeam = awayTeam;
         icGame.awayTeam = homeTeam;
      }
   }
}

function createDivisionalMatchups(nflseasons : Array<nflSeasonMatchups>, curSeasonMatchups : nflSeasonMatchups) {
   // extract previous season from nflseasons - using find
   // copy all the divisional games from the priorSeason into the curSeason
   // Make deep copies - not just pointer copies

   let priorSeasonYear : number = curSeasonMatchups.year - 1;
   let priorSeasonMatchups : nflSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   //console.log(" Dumping divisional matchups");
   curSeasonMatchups.divisionMatchups = copy(priorSeasonMatchups.divisionMatchups);
   //console.log(curSeasonMatchups.divisionMatchups);

   let dmu : nflDivisionMatchup;
   for (dmu of curSeasonMatchups.divisionMatchups) {
      //console.log(dmu.getInfo());

      let dg : nflGame;
      for (dg of dmu.games) {
         //console.log(dg.getInfo());
      }
   }
}

function writeGamesCsv(gameFileName : string, seasonMatchups : nflSeasonMatchups) {
   let gameWriteStream : fs.WriteStream = fs.createWriteStream(gameFileName);

   writeGamesCsvDivisionMatchups(gameWriteStream, seasonMatchups.divisionMatchups, ",division");
   writeGamesCsvDivisionMatchups(gameWriteStream, seasonMatchups.intraConferenceMatchups, "");
   writeGamesCsvDivisionMatchups(gameWriteStream, seasonMatchups.interConferenceMatchups, "");
   writeGamesCsvDivisionMatchups(gameWriteStream, seasonMatchups.intraConferenceFinishPlaceMatchups, "");

   // finally - walk through the teams and create byes

   let team : nflTeam;
   for (team of teams) {
      gameWriteStream.write(team.name + ",bye\n");
   }

   gameWriteStream.close();
}

function writeGamesCsvDivisionMatchups(gameWriteStream : fs.WriteStream, dmus : Array<nflDivisionMatchup>, param : string) {
   let dmu : nflDivisionMatchup;
   for(dmu of dmus) {
      let games : Array<nflGame> = dmu.games;
      let game : nflGame;
      for (game of games) {
         gameWriteStream.write(game.homeTeam.name + "," + game.awayTeam.name + param + "\n");
      }
   }
}
   
////////////////
// main function
////////////////
Fiber(
function() {
    //console.log('wait... ' + new Date);
    let myArgs : Array<string> = process.argv.slice(2);
    console.log('myArgs: ', myArgs);

    if (myArgs.length === 0) {
      throw new Error("ERROR: main: no arg for the year: ");
    }

    curYear = Number(myArgs[0]);

    let teamsCurYearFname : string = "nflteams" + String(curYear) + ".csv";
    fs.createReadStream(teamsCurYearFname).pipe(csv())
                                   .on('data',processTeamCsvLine)
                                   .on('end',endTeamsCsvFile);
    sleep(100);

    // Load history of past 4 seasons to support this years game matchups
    // place games into their proper categories: divisional, intraconference, interconference, intraConference finish place

    let games1YearBackFname : string = "games" + String(curYear-1) + ".csv";
    let games2YearsBackFname : string = "games" + String(curYear-2) + ".csv";
    let games3YearsBackFname : string = "games" + String(curYear-3) + ".csv";
    let games4YearsBackFname : string = "games" + String(curYear-4) + ".csv";
    createPriorSeasonMatchups(games1YearBackFname,curYear-1,nflseasons);  // support final placement, divisional
    createPriorSeasonMatchups(games2YearsBackFname,curYear-2,nflseasons);  // support final placement, divisional
    createPriorSeasonMatchups(games3YearsBackFname,curYear-3,nflseasons);  // support final placement
    createPriorSeasonMatchups(games4YearsBackFname,curYear-4,nflseasons);  // support intraconference


    // Walk through games for this season and assign into divisional matchup collections
    // under the season header

    let curSeasonMatchups : nflSeasonMatchups = new nflSeasonMatchups(curYear);
    createDivisionalMatchups(nflseasons,curSeasonMatchups);
    createIntraConferenceMatchups(nflseasons,curSeasonMatchups);
    createInterConferenceMatchups(nflseasons,curSeasonMatchups);
    createIntraConferenceFinishPlaceMatchups(nflseasons,curSeasonMatchups);  // TBD for final placement

    curSeasonMatchups.logSummary();

    //console.log(curSeasonMatchups);

    // TBD - Next
    // Write out games to cur season games file
    // walk through all of the division matchups withing curSeasonMatchups and write out to csv file
    // some comment changes to test git 

    let curYearGamesFileName : string = "nflgames" + String(curYear) + ".csv";
    writeGamesCsv(curYearGamesFileName,curSeasonMatchups);

}
).run();
//console.log('back in main');
