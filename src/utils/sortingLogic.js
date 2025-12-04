export const HOUSES = {
  GRYFFINDOR: {
    name: 'Gryffindor',
    color: '#740001',
    traits: ['brave', 'bold', 'daring', 'energetic', 'playful', 'loud'],
    description: 'Where dwell the brave at heart!'
  },
  SLYTHERIN: {
    name: 'Slytherin',
    color: '#1A472A',
    traits: ['cunning', 'ambitious', 'clever', 'sneaky', 'independent', 'resourceful'],
    description: 'Those of great ambition!'
  },
  RAVENCLAW: {
    name: 'Ravenclaw',
    color: '#222F5B',
    traits: ['wise', 'intelligent', 'curious', 'calm', 'observant', 'smart'],
    description: 'Where those of wit and learning will always find their kind.'
  },
  HUFFLEPUFF: {
    name: 'Hufflepuff',
    color: '#ECB939',
    traits: ['loyal', 'patient', 'friendly', 'hardworking', 'food', 'cuddly'],
    description: 'Just and loyal, those patient Hufflepuffs are true and unafraid of toil.'
  }
};

export function sortPet(text) {
  const lowerText = text.toLowerCase();
  const scores = {
    GRYFFINDOR: 0,
    SLYTHERIN: 0,
    RAVENCLAW: 0,
    HUFFLEPUFF: 0
  };

  // Simple keyword matching
  Object.keys(HOUSES).forEach(houseKey => {
    HOUSES[houseKey].traits.forEach(trait => {
      if (lowerText.includes(trait)) {
        scores[houseKey]++;
      }
    });
  });

  // Add some randomness if scores are tied or low
  scores.GRYFFINDOR += Math.random() * 0.5;
  scores.SLYTHERIN += Math.random() * 0.5;
  scores.RAVENCLAW += Math.random() * 0.5;
  scores.HUFFLEPUFF += Math.random() * 0.5;

  // Find the winner
  let winner = 'GRYFFINDOR';
  let maxScore = -1;

  Object.keys(scores).forEach(houseKey => {
    if (scores[houseKey] > maxScore) {
      maxScore = scores[houseKey];
      winner = houseKey;
    }
  });

  return HOUSES[winner];
}
