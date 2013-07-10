
exports.shuffle = function (array) {
    var tmp, current, top = array.length;

    if (top) while (--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
    }

    return array;
}

exports.getRandomK = function (array, k) {
    var shuffled = exports.shuffle(array);
    return shuffled.slice(0, k);
};
