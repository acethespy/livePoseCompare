
function toDegrees (angle) {
  return angle * (180 / Math.PI);
}

function convertToVectors(keypoints, calibratedWeights) {
	var vecs = []
	for (i = 0; i < calibratedWeightPairs.length; i++) {
        var pair = calibratedWeightPairs[i]
        var a = keypoints[pair[0]]['position']
        var b = keypoints[pair[1]]['position']
        var x = a['x'] - b['x']
        var y = a['y'] - b['y']
        var z = Math.sqrt(Math.abs(calibratedWeights[i] * calibratedWeights[i] - x * x - y * y))
        vecs.push([x, y, z])
    }
    return vecs
}

function compareVectors(user, model) {
	var ratings = []
	for (i = 0; i < user.length; i++) {
		ratings.push(toDegrees(Math.acos(math.dot(user[i], model[i])/(math.norm(user[i]) * math.norm(model[i])))))
	}
	return ratings
}
