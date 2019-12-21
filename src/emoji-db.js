const fs = require('fs');
const EmojiSearcher = require('./emoji-searcher');

function initDb({ dbDir, ignoreUnqualified }){
    // default db filenames
    const filePrefx = 'emojilist_';
    const fileSuffx = '.json';
    // load files
    let dbFiles = fs.readdirSync(dbDir);
    // remove non db files
    dbFiles = dbFiles.filter((dbFile) => {
        if (!dbFile.endsWith('.json') || !dbFile.startsWith(filePrefx)) {
            return false;
        }
        return true;
    });
    // make emoji db nums
    dbFiles = dbFiles.map((dbFile) => {
        return dbFile
            .replace(new RegExp('^'+filePrefx),'')
            .replace(new RegExp(fileSuffx+'$'),'');
    });
    // sort dbs
    dbFiles.sort((a, b) => {
        a = !a.match(/unqualified/) ? parseFloat(a) : Infinity;
        b = !b.match(/unqualified/) ? parseFloat(b) : Infinity;
        return a - b;
    });
    // load dbs
    let emojiDbData = {};
    for (const dbFile of dbFiles) {
        if(ignoreUnqualified && dbFile.match(/unqualified/)){
            continue;
        }
        let loadEmojiDbData = require(dbDir + filePrefx + dbFile + fileSuffx);
        emojiDbData = Object.assign({}, emojiDbData, loadEmojiDbData);
    }
    // return db
    return emojiDbData;
}

class EmojiDb {
    constructor({ useDefaultDb, dbDir, ignoreUnqualified }) {
        // set defaults
        this.codePointSeparator = '-';
        this.dbData = {};
        // empty db
        if(useDefaultDb && !dbDir){
            dbDir = __dirname + '/database/';
            this.dbData = initDb({ dbDir, ignoreUnqualified });
        }
        else if(!useDefaultDb && dbDir){
            this.dbData = initDb({ dbDir });
        }
    }
    searchFromText({ input, fixCodePoints, showData }){
        let foundEmojis = new EmojiSearcher(this.dbData).getEmojis(input);
        if(fixCodePoints || showData){
            let fixedFoundEmojis = [];
            for(let e of foundEmojis){
                e.found = fixEmojiCodePoint(e.found, this.dbData);
                e.emoji = this.dbData[e.found].emoji;
                fixedFoundEmojis.push(e);
            }
            foundEmojis = fixedFoundEmojis;
        }
        if(showData){
            const emojisData = [];
            for(let e of foundEmojis){
                emojisData.push(this.dbData[e.found]);
            }
            return { found: foundEmojis, data: [...new Set(emojisData)] };
        }
        else{
            return foundEmojis;
        }
    }
    toCodePoint(emoji, separator){
        let codePointArray = [];
        for (const textContent of emoji) {
            codePointArray.push(textContent.codePointAt(0).toString(16).padStart(4, '0'));
        }
        return codePointArray.join(separator || this.codePointSeparator);
    }
    fromCodePoint(codePoint, separator){
        separator = separator || this.codePointSeparator;
        if(typeof codePoint === 'string'){
            let codePointArray = codePoint.split(separator);
            for (let c in codePointArray) {
                codePointArray[c] = String.fromCodePoint(parseInt(codePointArray[c], 16));
            }
            return codePointArray.join('');
        }
        return String.fromCodePoint(codePoint);
    }
    toCodePointArray(emojiArray, separator){
        let codePointArray = [];
        separator = separator || this.codePointSeparator;
        for (let ix = 0; ix < emojiArray.length; ix++) {
            codePointArray.push(this.toCodePoint(emojiArray[ix], separator));
        }
        return codePointArray;
    }
}

function fixEmojiCodePoint(codePoint, dbData){
    if(dbData[codePoint] && dbData[codePoint].qualified && dbData[dbData[codePoint].qualified]){
        return dbData[codePoint].qualified;
    }
    return codePoint;
}

module.exports = EmojiDb;
