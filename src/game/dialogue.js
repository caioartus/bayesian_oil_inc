// All story & tutorial text lives here, so it's easy to tweak or translate.
// Use *asterisks* to highlight key words.

export const STORY = [
  [
    'This is *Bayesian Oil Inc.*, once the proudest little oil company in the whole desert.',
    'For fifty years its pumps nodded happily, day and night...',
  ],
  ['...until one day, the wells ran dry.', 'The stock crashed by *87%*. Then it crashed again.'],
  ['The investors were *NOT* happy.'],
  [
    'The board gave the new CEO, *you*, one last chance: a strip of desert, *12 drilling permits*, and money for exactly *ONE oil rig*.',
    'Find the richest spot. Build the rig. Save the company. *No pressure.*',
  ],
];

export const INVESTOR_SHOUTS = ["WHERE'S THE OIL?!", 'MY MONEY!!', 'FIRE THE CEO!', 'DO SOMETHING!'];

export const FIELD = {
  arrive: 'Hm... I think we just try and spread out the drillings.',
  hintMarkers: 'Walk to a ▼ marker and press SPACE (A) to drill.',
  notMarker: "Let's stick to the plan: drill at the markers.",
  midway: "Hmm, that's... some oil. Let's keep going.",
  stuck: '4 wells and I still have no idea where the big reservoir is...',
  callIdea: 'Maybe I should call the Professor.',
  hintCall: 'Press B to call the Professor',
};

export const PROF_ARRIVE = [
  'Spreading wells out evenly? That is just guessing with a ruler!',
  'You have *8 permits left*. Each well costs a fortune. We have to choose every spot *cleverly*, using everything we already learned.',
  'Come to my lab. I will show you *Bayesian optimisation*!',
];

export const LAB = {
  intro: [
    'Welcome to my lab! This blueprint shows our strip of desert: position on the bottom, oil on the side.',
    'The orange dots are your *4 wells*. Somewhere out there is a hidden *oil curve f(x)*, and we want its highest point.',
  ],
  gp: [
    "We don't know f. But we do believe something about it: oil changes *smoothly*. Spots close together have similar yields.",
    'A *Gaussian Process* (GP) turns that belief into maths. It is a probability distribution over *smooth functions*.',
    'These wiggling lines are random functions drawn from the GP. Before seeing any data, any of them could be the truth!',
  ],
  kernel: [
    'How wiggly the functions are depends on the *kernel*. Ours has two knobs:',
    'The *length-scale ℓ*: how far you walk before oil changes a lot. And the *amplitude σ*: how big the changes are.',
    'Choosing them is choosing our *prior*. In real life we use expert knowledge, then check how well each choice explains the data.',
  ],
  pickEll:
    'Our geologists sent reports from neighbouring fields. Each suggests a length-scale. The green bar is the *data support*: how well each prior explains our 4 wells.',
  ellNote: [
    'With only 4 wells the data support is a rough hint, not proof. That is why expert knowledge matters so much early on!',
  ],
  pickSf: 'Now the amplitude. How much does oil vary from spot to spot? Again the bar shows how well each option explains our wells.',
  sfNote:
    "Funny: our 4 wells happen to be poor ones, so the data alone prefers a *small* amplitude. But fields nearby have produced up to ~1000 bbl/d. Experience says '*moderately*'. That is exactly what priors are for!",
  sfNoteLittle: 'We will go with your choice. If the search feels too timid, you can change it in the lab later.',
  condition: ['Now the magic. We *condition* the GP on our wells: we keep only the functions that pass through the data.'],
  posterior: [
    'The white line is the *posterior mean*: our best guess for f. The shaded band is *±2 standard deviations*: where the truth probably lies.',
    'See? Near our wells we are confident: the band is thin. Far away it is wide. Anything could be hiding there!',
  ],
  acqIntro: [
    'So where do we drill next? We need an *acquisition function*: a score for how promising every spot is.',
    'A high mean means we *exploit* what we know. A wide band means we *explore* the unknown. A good acquisition balances both.',
    'Pick one! The green curve below shows its score, and the *★* marks where it says to drill.',
  ],
  foil: [
    'Hmm, a risky choice! You can try it, but keep an eye on the result. You can always come back and switch.',
  ],
  goodPick: ['Excellent choice!'],
  loop: [
    'And that is *Bayesian optimisation*! It is a loop: fit the GP, maximise the acquisition, drill there, add the result, repeat.',
    'Out in the field your *radar* shows the acquisition function. Walk to the *★* and drill!',
    'Press *B* any time to come back here and see the full picture, or to change your prior or acquisition. Good luck!',
  ],
  revisit: 'Welcome back! Here is everything we know so far. What do you want to do?',
  free: 'Free play! New field, 12 permits, no hand-holding. Pick your prior and acquisition, then go find that oil.',
};

export const BO = {
  radio: [
    'Can you hear me? Look at the *radar* in the top-right corner: that is your acquisition function.',
    'The *★* marks the best spot to drill next. The white line is you. Walk there and press *SPACE (A)*!',
  ],
  freeRadio: ['No data yet, so the radar is flat. Every spot looks equally promising. Drill anywhere to start!'],
  firstDrill: 'See how the radar changed? The well taught the GP something, so the uncertainty around it shrank.',
  record: 'A new record! The GP now believes the area around here is promising.',
  offStar: "You drilled away from the ★. Free will is nice, but permits are precious!",
  converged:
    'The radar keeps pointing at a well we already drilled. We have probably found the peak! You could build the rig now (press B).',
  lastPermit: 'Last permit! Make it count.',
  noPermits: ['That was our last permit!', 'Now choose where to build our *ONE rig*. Tip: the spot where we measured the most oil is the safest bet.'],
  rigHint: 'Walk to the rig spot and press SPACE (A) to build',
  alreadyDrilled: 'We already drilled right here!',
};

export const REVEAL = {
  stars3: 'LEGENDARY! The investors are dancing!',
  stars2: 'Great find! The stock is soaring!',
  stars1: 'Not bad... the investors are cautiously optimistic.',
  stars0: 'Ouch. The investors fainted.',
};
