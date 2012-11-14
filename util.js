var DICTIONARY = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('');

function generateID(seed) {
    /* Given a seed, this function will return a 'shortened' URL */
    if(typeof(seed)==='undefined') seed = new Date().getTime();
    return encode(seed);
}

function getSeedFromID(id) {
    /* Given a 'shortened' URL, it will return the seed */
    if(typeof(seed)==='undefined') return -1;
    return decode(id);
}

function encode(i) {
    /* Generates a 'shortened' URL */
    if (i == 0) return DICTIONARY[0];

    var result = '';
    var base = DICTIONARY.length;

    while (i > 0) {
        result += DICTIONARY[i % base];
        i = Math.floor(i / base);
    }

    return result;
}

function decode(i) {
    /* Returns the original input from a 'shortened' URL */
    var i = 0;
    var base = DICTIONARY.length;

    input.split("").forEach(function(c){
        i = i * base + DICTIONARY.indexOf(c);
    });

    return i;
}

exports.getRandomId = generateID;