//var fs = require('fs');
import fs = require("fs");

//var csv = require('fast-csv');
import csv = require("fast-csv");
//var sync = require('synchronize');

//var Sync = require("sync");
import Sync = require("Sync");

var numGames = 0;
var numTeams = 0;
var teams = new Array();
var games = new Array();

//var Fiber = require('fibers');
import Fiber = require("fibers");

function sleep(ms) {
    var fiber = Fiber.current;
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

function nflTeam (name,conference,division,finishPlace) {
    this.name = name.toLowerCase();
    this.conference = conference.toLowerCase();
    this.division = division.toLowerCase();
    this.finishPlace = finishPlace;
}
 
nflTeam.prototype.getInfo = function() {
    return this.name + ' in ' + this.conference + '.' + this.division + " finishPlace: " + this.finishPlace;
};

// find function
// passed "this" is a team name string
function teamMatch(team) {
  return team.name == this;
}

function processTeamCsvLine(data){
   var team = new nflTeam(data[0],data[1],data[2],data[3]);
   //console.log(team.getInfo());
   teams.push(team);
   numTeams++;
}

function endTeamsCsvFile(data){
   console.log('Read finished');
   console.log('numTeams is ' + numTeams);
   console.log('teams.length is ' + teams.length)
}

// end nflTeam //

///////////////////////////////////////////
// nflGame
// Models an nfl game matchup
// homeTeam, awayTeam : object references, not just names
///////////////////////////////////////////

function nflGame (homeTeamName,awayTeamName) {
    var homeTeam = teams.find(teamMatch,homeTeamName);
    var awayTeam = teams.find(teamMatch,awayTeamName);
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
}

nflGame.prototype.getInfo = function() {
   return this.homeTeam.name + ' vs ' + this.awayTeam.name;
};

// find function
// passed "this" is another game
function gameMatch(g) {
  return (g.homeTeam === this.homeTeam && g.awayTeam === this.awayTeam);
}

function processGameCsvLine(data){
   if (data[1].toLowerCase() == 'bye') {
      return;
   }

   var game = new nflGame(data[0],data[1]);
   games.push(game);
   numGames++;
}

function endGamesCsvFile(data){
   console.log('Read finished');
   console.log('numGames is ' + numGames);
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

function nflDivisionMatchup (team1,team2) {
    this.conference1 = team1.conference;
    this.division1 = team1.division;
    this.conference2 = team2.conference;
    this.division2 = team2.division;
    this.games = new Array();
}

nflDivisionMatchup.prototype.getInfo = function() {
    return this.conference1 + '.' + this.division1 + ' vs ' + 
           this.conference2 + '.' + this.division2 + ' games: ' + this.games.length;
};

// find functions
// passed "this" is an nflGame
function divisionMatchUpMatchByGame(divMU) {
   var divMU_confDiv1 = divMU.conference1 + "." + divMU.division1;
   var divMU_confDiv2 = divMU.conference2 + "." + divMU.division2;
   var game_confDivHome = this.homeTeam.conference + "." + this.homeTeam.division;
   var game_confDivAway = this.awayTeam.conference + "." + this.awayTeam.division;

   return (divMU_confDiv1 == game_confDivHome && divMU_confDiv2 == game_confDivAway) ||
          (divMU_confDiv1 == game_confDivAway && divMU_confDiv2 == game_confDivHome);
}

function divisionMatchUpMatchByPlacementHistory(divMU) {
   var divMU_confDiv1 = divMU.conference1 + "." + divMU.division1;
   var divMU_confDiv2 = divMU.conference2 + "." + divMU.division2;
   var history_confDiv1 = this.conference + "." + this.division1;
   var history_confDiv2 = this.conference + "." + this.division2;

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

function nflSeasonMatchups (year) {
    this.year = year;
    this.divisionMatchups = new Array();
    this.intraConferenceMatchups = new Array();
    this.intraConferenceFinishPlaceMatchups = new Array();
    this.interConferenceMatchups = new Array();
}

nflSeasonMatchups.prototype.getInfo = function() {
    return this.year + " divisionMatchups: " + this.divisionMatchups.length + 
                       " intraConferenceMatchups: " + this.intraConferenceMatchups.length + 
                       " intraConferenceFinishPlaceMatchups: " + this.intraConferenceFinishPlaceMatchups.length + 
                       " interConferenceMatchups: " + this.interConferenceMatchups.length;
};

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

// nflFinishPlaceMatchupHistory
//
// homeAwayHistory[2] : for 2 years ago
// homeAwayHistory[1] : for 1 years ago
// homeAwayHistory[0] : for this year

function nflFinishPlaceMatchupHistory (conference,division1,division2) {
    this.conference = conference;
    this.division1 = division1;
    this.division2 = division2;
    this.homeAwayHistory = "--";  // [0] 2 years ago, [1] 1 year ago
    this.homeAwayThisYear = "-";
    this.pattern = "-HR-RH-";
    // this.pattern = "-HR-RH-";
    // this.pattern = "-RR-HH-";  // AFC-East or NFC-North is either of the 2 divisions
}


nflFinishPlaceMatchupHistory.prototype.getInfo = function() {
   return this.conference + " : " + this.division1 + " vs " + this.division2 + " : homeAwayHistory : " + 
          this.homeAwayHistory[2] + this.homeAwayHistory[1] + this.homeAwayHistory[0];
};

// find function
// passed "this" is an nflGame
function finishPlaceHistoryMatchByGame(finishPlaceHistory) {
   var team1 = this.homeTeam;
   var team2 = this.awayTeam;
   var fphConference = finishPlaceHistory.conference;
   var fphDivision1  = finishPlaceHistory.division1;
   var fphDivision2  = finishPlaceHistory.division2;

   return (fphConference == team1.conference && fphDivision1 == team1.division && fphDivision2 == team2.division2);
}

// end nflFinishPlaceMatchupHistory //


///////////////////////////////////////////
// nflseasons array ///////////////////////
// Previous seasons games categorized into nflSeasonMatchups objects
// Input data necessary to generate the next seasons games
///////////////////////////////////////////

var nflseasons = new Array();

///////////////////////////////////////////
// nflgames array   ///////////////////////
// Receives the created games for the next season based on the games from previous seasons
// and also based on the standings from the previous season
///////////////////////////////////////////

var nflgames = new Array();

//////////////////////////////
// createPriorSeasonMatchups - read in prior seasons and sort games into different matchup categories
//////////////////////////////

function createPriorSeasonMatchups(gameFileName, year, nflseasons) {
   games = new Array();
   fs.createReadStream(gameFileName).pipe(csv())
                                    .on('data',processGameCsvLine)
                                    .on('end',endGamesCsvFile);
   sleep(100);
   // Testing the loading of games
   console.log('games.length before matchup sorting is ' + games.length);

   var priorSeasonMatchups = new nflSeasonMatchups(year);
   nflseasons.push(priorSeasonMatchups);

   // loop through games and distribute into curSeasonMatchups
   var i:number; 

   for (i=0; i < games.length; i++) {
      var game = games[i];
      // find homeTeam and awayTeam
      //var homeTeam = teams.find(teamMatch, game.homeTeam);
      //var awayTeam = teams.find(teamMatch, game.awayTeam);
      var homeTeam = game.homeTeam;
      var awayTeam = game.awayTeam;
      //console.log("createPriorSeasonMatchups game homeTeam: " + game.homeTeam + " awayTeam: " + game.awayTeam);
      //console.log("createPriorSeasonMatchups found homeTeam: " + homeTeam.name + " awayTeam: " + awayTeam.name);

      // determine if divisional game
      if (homeTeam.conference == awayTeam.conference) {
         if (homeTeam.division == awayTeam.division) {
         	// divisional matchup
         	var divisionMatchup = priorSeasonMatchups.divisionMatchups.find(divisionMatchUpMatchByGame,game);
         	if (divisionMatchup === undefined) {
         		divisionMatchup = new nflDivisionMatchup(homeTeam,awayTeam);
         		priorSeasonMatchups.divisionMatchups.push(divisionMatchup);
         	}
         	divisionMatchup.games.push(game);
         }
         else {
         	// intraConference matchup
          	var divisionMatchup = priorSeasonMatchups.intraConferenceMatchups.find(divisionMatchUpMatchByGame,game);
         	if (divisionMatchup === undefined) {
             divisionMatchup = new nflDivisionMatchup(homeTeam,awayTeam);
             priorSeasonMatchups.intraConferenceMatchups.push(divisionMatchup);
        	}
          	divisionMatchup.games.push(game);
         }
      }
      else {
         // interConference matchup
         var divisionMatchup = priorSeasonMatchups.interConferenceMatchups.find(divisionMatchUpMatchByGame,game);
         if (divisionMatchup === undefined) {
            divisionMatchup = new nflDivisionMatchup(homeTeam,awayTeam);
            priorSeasonMatchups.interConferenceMatchups.push(divisionMatchup);
         }
         divisionMatchup.games.push(game);
      }
   }

   console.log(priorSeasonMatchups.getInfo());
   // post process the division matchups for 
   var primaryIntraConferenceMatchups = new Array();

   console.log("priorSeasonMatchups.intraConferenceMatchups");
   var j:number; 
   for (j=0; j< priorSeasonMatchups.intraConferenceMatchups.length; j++) {
   	  var intraConfDivMU = priorSeasonMatchups.intraConferenceMatchups[j];
      //console.log(intraConfDivMU);
      if (intraConfDivMU.games.length == 4) {
         // this is a set of intra-conference placement matchups - move to that collection
         priorSeasonMatchups.intraConferenceFinishPlaceMatchups.push(intraConfDivMU);
      }
      else {
         primaryIntraConferenceMatchups.push(intraConfDivMU);
      }
   }
   priorSeasonMatchups.intraConferenceMatchups.length = 0;
   priorSeasonMatchups.intraConferenceMatchups = primaryIntraConferenceMatchups;
   console.log(priorSeasonMatchups.getInfo());
   for (j=0; j< priorSeasonMatchups.intraConferenceMatchups.length; j++) {
   	  var intraConfDivMU = priorSeasonMatchups.intraConferenceMatchups[j];
   	  console.log(intraConfDivMU);
   }
}

/////////////////////
// Deep copy function
/////////////////////

function copy(o) {
   var output, v, key;
   output = Array.isArray(o) ? [] : {};
   for (key in o) {
       v = o[key];
       output[key] = (typeof v === "object") ? copy(v) : v;
   }
   return output;
}

// Utility function for replacing a character within a string
function setCharAt(str,index,chr) {
   if(index > str.length-1) return str;
   return str.substr(0,index) + chr + str.substr(index+1);
}

function createIntraConferenceMatchups(nflseasons,curSeasonMatchups) {
   // extract previous season from nflseasons - using find
   // copy all the intraconference games from the priorSeason into the curSeason
   // Make deep copies - not just pointer copies
   // Then switch the home and away teams from the priorseason

   var priorSeasonYear = curSeasonMatchups.year - 3;
   var priorSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: createIntraConferenceMatchups: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   curSeasonMatchups.intraConferenceMatchups = copy(priorSeasonMatchups.intraConferenceMatchups);
   console.log(" Dumping IntraConference matchups");

   for (var icmi in curSeasonMatchups.intraConferenceMatchups) {
      var icmu = curSeasonMatchups.intraConferenceMatchups[icmi];
      console.log(icmu.getInfo());
      for (var icgi in icmu.games) {
         var icGame = icmu.games[icgi];
         var homeTeam = icGame.homeTeam;
         var awayTeam = icGame.awayTeam;
         // swap home and away from 3 years ago
         icGame.homeTeam = awayTeam;
         icGame.awayTeam = homeTeam;
         console.log(icGame.getInfo());
      }
   }
}

function createIntraConferenceFinishPlaceMatchups(nflseasons,curSeasonMatchups) {

   // draw history from previous 2 years
   // build a collection of objects (nflFinishPlaceMatchupHistory) for each divisional matchup
   // populate the nflFinishPlaceMatchupHistory object with last 2 year home/away history 
   // and determine the home away pattern based on the 2 divisions playing each other
   // 
   var priorSeasonYear = curSeasonMatchups.year - 3;
   var priorSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: createIntraConferenceFinishPlaceMatchups: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   curSeasonMatchups.intraConferenceFinishPlaceMatchups = copy(priorSeasonMatchups.intraConferenceFinishPlaceMatchups);

   var finishPlaceHistory = new Array();
   var curYear = curSeasonMatchups.year;

   for (var priorYear = curYear-2; priorYear < curYear; priorYear++) {
      var priorSeasonMatchups = nflseasons.find(seasonMatch,priorYear);
      if (priorSeasonMatchups === undefined) {
         throw new Error("ERROR: createIntraConferenceFinishPlaceMatchups: failed to find priorSeasonMatchups for year: " + priorYear);
      }

      var icfpms = priorSeasonMatchups.intraConferenceFinishPlaceMatchups;  // 8 total matchups
      for (var icfpmi in icfpms) {
         var icfpm = icfpms[icfpmi];
         for (var icfpgi in icfpm.games) {
            var icfpGame = icfpm.games[icfpgi];
            var homeTeam = icfpGame.homeTeam;
            var awayTeam = icfpGame.awayTeam;
            // determine if these divisions exist in the history collection
            // if not create a new history object

            // put home away history into the proper history slot
            var historyStringIndex = 2 - (curYear - priorYear);     // 2-(2019 -2017) = 0,   2-(2019 - 2018) = 1

            // find history object or create it if it doesn't exist

            var divFinishPlaceHistory = finishPlaceHistory.find(finishPlaceHistoryMatchByGame, icfpGame);
            if (divFinishPlaceHistory === undefined) {
               divFinishPlaceHistory = new nflFinishPlaceMatchupHistory(icfpGame.homeTeam.conference,homeTeam.division,awayTeam.division);
               finishPlaceHistory.push(divFinishPlaceHistory);
               // set the appropriate home away history pattern
               if (homeTeam.conference === "afc" && homeTeam.division === "east"  ||
                   homeTeam.conference === "nfc" && homeTeam.division === "north" ||
                   awayTeam.conference === "afc" && awayTeam.division === "east"  ||
                   awayTeam.conference === "nfc" && awayTeam.division === "north") {
                  divFinishPlaceHistory.pattern = "-RR-HH-R";
               }
               else {
                  divFinishPlaceHistory.pattern = "-HR-RH-H";
               }
               
               var homeAwayHistory = divFinishPlaceHistory.homeAwayHistory;
               if (homeTeam.division == divFinishPlaceHistory.division1) {
                  divFinishPlaceHistory.homeAwayHistory = setCharAt(homeAwayHistory,historyStringIndex,'H');
               }
               else {
                  divFinishPlaceHistory.homeAwayHistory = setCharAt(homeAwayHistory,historyStringIndex,'R');
               }
            }
         }
      } 
   }

   // Npw we have the home away history for the past 2 years
   // Now determine the next home/away location in the pattern for each divisional matchup in the collection
   // and create the games between the 2 divisions

   for (var fpdmhi in finishPlaceHistory) {
      var fpdmh = finishPlaceHistory[fpdmhi];
      // match the history to the pattern and find the next home/away/not matched value
      // set the next home/away/not matched value  .homeAwayThisYear
      var n = fpdmh.pattern.indexOf(fpdmh.homeAwayHistory);

      if (n == -1) {
         throw new Error("ERROR: createIntraConferenceFinishPlaceMatchups: failed to find homeAwayHistory: " + fpdmh.homeAwayHistory + ", in pattern: " + fpdmh.pattern);
      }

      fpdmh.homeAwayThisYear = fpdmh.homeAwayHistory[n+2];
      // could probably just go ahead and create the finish place matched games now
      // if the next home/away location is "-" that means the divisions don't do finish place matching in the current season

      if (fpdmh.homeAwayThisYear == "-") {
         continue;
      }

      var fpdm = curSeasonMatchups.intraConferenceFinishPlaceMatchups.find(divisionMatchUpMatchByPlacementHistory,fpdmh);
      if (fpdm === undefined) {
         throw new Error("ERROR: createIntraConferenceFinishPlaceMatchups: failed to find finishPlaceDivisionMatchup for current year");
      }
   
      fpdm.games = [];   // clear the games array from the old historical games - we'll be adding new games according to the pattern

      var divPlacementTeams = teams.filter(finalPlacementTeamFilter, fpdmh);
      divPlacementTeams.sort(finalPlacementTeamSort);

      var gameCount = divPlacementTeams.length/2;

      for (var gi = 0; gi < gameCount; gi++) {
         var team1 = divPlacementTeams[gi*2];
         var team2 = divPlacementTeams[gi*2 + 1];
         var game = new nflGame(team1.name, team2.name);
         fpdm.games.push(game);
      }
   }
}

 function finalPlacementTeamFilter(team) {
    // this is nflFinishPlaceMatchupHistory
    if (team.conference == this.conference && (team.division == this.division1 || team.division == this.division2)) {
       return true;
    }
    return false;
 }

 function finalPlacementTeamSort(team1, team2) {
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

/*
      for (priorSeasonGame in icfpm.games)
function nflFinishPlaceMatchupHistory (conference,division1,division2) {
function finishPlaceHistoryMatchByGame(conference,division1,division2) {
  var priorSeasonMatchups = new nflSeasonMatchups(year);

  function nflSeasonMatchups (year) {
    this.year = year;
    this.divisionMatchups = new Array();                     // array of nflDivisionMatchup
    this.intraConferenceMatchups = new Array();              // array of nflDivisionMatchup
    this.intraConferenceFinishPlaceMatchups = new Array();   // array of nflDivisionMatchup
    this.interConferenceMatchups = new Array();              // array of nflDivisionMatchup

function nflDivisionMatchup (team1,team2) {
    this.conference1 = team1.conference;
    this.division1 = team1.division;
    this.conference2 = team2.conference;
    this.division2 = team2.division;
    this.games = new Array();

function nflFinishPlaceMatchupHistory (conference,division1,division2) {
    this.conference = conference;
    this.division1 = division1;
    this.division2 = division2;
    this.homeAwayHistory = "--";  // [0] 2 years ago, [1] 1 year ago
    this.homeAwayThisYear = "-";
    this.pattern = "-HR-RH-H";
    // this.pattern = "-HR-RH-H";
    // this.pattern = "-RR-HH-R";  // AFC-East or NFC-North

   var priorSeasonYear = curSeasonMatchups.year - 2;
   var priorSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: createIntraConferenceFinishPlaceMatchups: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   curSeasonMatchups.intraConferenceFinishPlaceMatchups = copy(priorSeasonMatchups.intraConferenceFinishPlaceMatchups);
   console.log(" Dumping IntraConference placement matchups");
   for (icmi in curSeasonMatchups.intraConferenceFinishPlaceMatchups) {
      var icmu = curSeasonMatchups.intraConferenceFinishPlaceMatchups[icmi];
      console.log(icmu.getInfo());
      for (icgi in icmu.games) {
         var icGame = icmu.games[icgi];
         var homeTeam = icGame.homeTeam;
         var awayTeam = icGame.awayTeam;
         // swap home and away from 3 years ago
         icGame.homeTeam = awayTeam;
         icGame.awayTeam = homeTeam;
         console.log(icGame.getInfo());
      }
   }
*/

function createInterConferenceMatchups(nflseasons,curSeasonMatchups) {
   // extract previous season from nflseasons - using find
   // copy all the interconference games from the priorSeason into the curSeason
   // Make deep copies - not just pointer copies
   // Then switch the home and away teams from the priorseason

   var priorSeasonYear = curSeasonMatchups.year - 4;
   var priorSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: createInterConferenceMatchups: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   curSeasonMatchups.interConferenceMatchups = copy(priorSeasonMatchups.interConferenceMatchups);
   console.log(" Dumping InterConference matchups");
   for (var icmi in curSeasonMatchups.interConferenceMatchups) {
      var icmu = curSeasonMatchups.interConferenceMatchups[icmi];
      console.log(icmu.getInfo());
      for (var icgi in icmu.games) {
         var icGame = icmu.games[icgi];
         var homeTeam = icGame.homeTeam;
         var awayTeam = icGame.awayTeam;
         // swap home and away from 3 years ago
         icGame.homeTeam = awayTeam;
         icGame.awayTeam = homeTeam;
         console.log(icGame.getInfo());
      }
   }
}

function createDivisionalMatchups(nflseasons,curSeasonMatchups) {
   // extract previous season from nflseasons - using find
   // copy all the divisional games from the priorSeason into the curSeason
   // Make deep copies - not just pointer copies

   var priorSeasonYear = curSeasonMatchups.year - 1;
   var priorSeasonMatchups = nflseasons.find(seasonMatch,priorSeasonYear);

   if (priorSeasonMatchups === undefined) {
      throw new Error("ERROR: failed to find priorSeasonMatchups for year: " + priorSeasonYear);
   }

   console.log(" Dumping divisional matchups");
   curSeasonMatchups.divisionMatchups = copy(priorSeasonMatchups.divisionMatchups);
   //console.log(curSeasonMatchups.divisionMatchups);
   for (var dmi in curSeasonMatchups.divisionMatchups) {
      var dmu = curSeasonMatchups.divisionMatchups[dmi];
      console.log(dmu.getInfo());
      for (var dgi in dmu.games) {
         console.log(dmu.games[dgi].getInfo());
      }
   }
}

////////////////
// main function
////////////////
Fiber(
function() {
    console.log('wait... ' + new Date);
    fs.createReadStream('nflteams.csv').pipe(csv())
                                   .on('data',processTeamCsvLine)
                                   .on('end',endTeamsCsvFile);
    sleep(100);

    // Load history of past 4 seasons to support this years game matchups
    // place games into their proper categories: divisional, intraconference, interconference, intraConference finish place

    createPriorSeasonMatchups('nflgames.csv',2018,nflseasons);  // support final placement, divisional
    createPriorSeasonMatchups('nflgames.csv',2017,nflseasons);  // support final placement
    createPriorSeasonMatchups('nflgames.csv',2016,nflseasons);  // support intraconference
    createPriorSeasonMatchups('nflgames.csv',2015,nflseasons);  // support interConference


    // Walk through games for this season and assign into divisional matchup collections
    // under the season header

    var curSeasonMatchups = new nflSeasonMatchups(2019);
    createDivisionalMatchups(nflseasons,curSeasonMatchups);
    createIntraConferenceMatchups(nflseasons,curSeasonMatchups);
    createInterConferenceMatchups(nflseasons,curSeasonMatchups);
    createIntraConferenceFinishPlaceMatchups(nflseasons,curSeasonMatchups);  // TBD for final placement

    console.log(curSeasonMatchups);

    // TBD - Next
    // Write out games to cur season games file
    // walk through all of the division matchups withing curSeasonMatchups and write out to csv file
    // some comment changes to test git 

    // seasonMatchups('nflgames.csv','2018');
    //    read in games - create a season header, sort games into matchup collections
    //    Header will have a collection of nflDivisionalMatchup objects
    //    Each nflDivisionalMatchup will have a collection of games
    //    a findDivisionalMatchup function will find (or not) the matchup object to add to 
    //    by taking a game and looking for a matchup object with the 2 conferences and div
    //    be mindful that the order of the divisions could be reversed

    // Testing of array find, and synchronous execution
    // test git - from within vscode
}
).run();
console.log('back in main');

// var name = cars[0];
// var x = cars.length;   // The length property returns the number of elements
// var y = cars.sort();   // The sort() method sorts arrays

/*
text = "<ul>";
fruits.forEach(myFunction);
text += "</ul>";

function myFunction(value) {
  text += "<li>" + value + "</li>";
}

function Apple (type) {
    this.type = type;
    this.color = "red";
}
 
Apple.prototype.getInfo = function() {
    return this.color + ' ' + this.type + ' apple';
};

var apple = new Apple('macintosh');
apple.color = "reddish";
alert(apple.getInfo());


*/
// fruits.push("Lemon");    // adds a new element (Lemon) to fruits

