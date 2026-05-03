export const MOOD_REGISTRY = {
  // ==========================================
  // POSITIVE MOODS
  // ==========================================
  OVERJOYED: {
    category: 'positive',
    emoji: '🤩',
    title: 'Overjoyed',
    subtitle: 'You are radiating incredible positive energy today.',
    gradientHex: ['0xFFFDE68A', '0xFFF59E0B'], // Bright Yellow -> Amber
    illustrationId: 'anim_sparkles',
    ctaLabel: 'Capture This Moment',
    cardStyle: 'BRIGHT_GLASS',
    quickTools: ['Gratitude Journal', 'Save Memory', 'Share Streak'],
    questionIds: ['pos_q1', 'pos_q2', 'pos_q3'],
    crisisThreshold: false,
  },
  HAPPY: {
    category: 'positive',
    emoji: '😊',
    title: 'Happy',
    subtitle: 'You seem to be having a bright and uplifting day.',
    gradientHex: ['0xFFFEF3C7', '0xFFFBBF24'], // Soft Yellow -> Dark Yellow
    illustrationId: 'anim_sun',
    ctaLabel: 'Save This Moment',
    cardStyle: 'BRIGHT_GLASS',
    quickTools: ['Gratitude Journal', 'Save Memory', 'Share Streak'],
    questionIds: ['pos_q1', 'pos_q2', 'pos_q3'],
    crisisThreshold: false,
  },
  CALM: {
    category: 'positive',
    emoji: '😌',
    title: 'Calm',
    subtitle: 'Your mind seems steady, grounded, and at peace.',
    gradientHex: ['0xFFD1FAE5', '0xFF10B981'], // Mint -> Emerald
    illustrationId: 'anim_leaves',
    ctaLabel: 'Rest in the Calm',
    cardStyle: 'SOFT_GLASS',
    quickTools: ['Mindful Breathing', 'Journal', 'Save Memory'],
    questionIds: ['pos_q2', 'calm_q1', 'calm_q2'],
    crisisThreshold: false,
  },
  GRATEFUL: {
    category: 'positive',
    emoji: '🙏',
    title: 'Grateful',
    subtitle: 'You are vibrating with appreciation today.',
    gradientHex: ['0xFFFBCFE8', '0xFFEC4899'], // Soft Pink -> Pink
    illustrationId: 'anim_heart_glow',
    ctaLabel: 'Log Gratitude',
    cardStyle: 'BRIGHT_GLASS',
    quickTools: ['Gratitude Journal', 'Save Memory', 'Send Thanks'],
    questionIds: ['grat_q1', 'pos_q2', 'grat_q2'],
    crisisThreshold: false,
  },

  // ==========================================
  // NEUTRAL MOODS
  // ==========================================
  NEUTRAL: {
    category: 'neutral',
    emoji: '😐',
    title: 'Neutral',
    subtitle: 'You are floating in the middle right now.',
    gradientHex: ['0xFFE5E7EB', '0xFF9CA3AF'], // Gray 200 -> Gray 400
    illustrationId: 'anim_balance',
    ctaLabel: 'Check In',
    cardStyle: 'MUTED_GLASS',
    quickTools: ['Hydration Tracker', 'Short Walk', 'Journal'],
    questionIds: ['neu_q1', 'neu_q2', 'neu_q3'],
    crisisThreshold: false,
  },
  TIRED: {
    category: 'neutral',
    emoji: '🥱',
    title: 'Tired',
    subtitle: 'Your energy levels flow a bit lower than usual.',
    gradientHex: ['0xFFDBEAFE', '0xFF60A5FA'], // Light Blue -> Blue
    illustrationId: 'anim_low_energy',
    ctaLabel: 'Prioritize Rest',
    cardStyle: 'MUTED_GLASS',
    quickTools: ['Sleep Mode', 'Yoga Nidra', 'Hydration Tracker'],
    questionIds: ['neu_q2', 'tired_q1', 'tired_q2'],
    crisisThreshold: false,
  },
  DISTRACTED: {
    category: 'neutral',
    emoji: '😵‍💫',
    title: 'Distracted',
    subtitle: 'Your focus seems scattered and hard to gather today.',
    gradientHex: ['0xFFE0E7FF', '0xFF818CF8'], // Soft Indigo
    illustrationId: 'anim_scatter',
    ctaLabel: 'Regain Focus',
    cardStyle: 'MUTED_GLASS',
    quickTools: ['Focus Timer', 'Box Breathing', 'Short Walk'],
    questionIds: ['dist_q1', 'dist_q2', 'neu_q3'],
    crisisThreshold: false,
  },
  NUMB: {
    category: 'neutral',
    emoji: '😶',
    title: 'Numb',
    subtitle: 'You might be feeling a bit disconnected from your emotions.',
    gradientHex: ['0xFFF3F4F6', '0xFF6B7280'], // Gray -> Dark Gray
    illustrationId: 'anim_static',
    ctaLabel: 'Gentle Grounding',
    cardStyle: 'MUTED_GLASS',
    quickTools: ['5-4-3-2-1 Grounding', 'Journal', 'Hydration Tracker'],
    questionIds: ['numb_q1', 'neu_q1', 'neu_q2'],
    crisisThreshold: false,
  },

  // ==========================================
  // NEGATIVE MOODS
  // ==========================================
  SAD: {
    category: 'negative',
    emoji: '😔',
    title: 'Sad',
    subtitle: 'You may be carrying a lot emotionally today.',
    gradientHex: ['0xFF93C5FD', '0xFF2563EB'], // Blue 300 -> Blue 600
    illustrationId: 'anim_rain_cloud',
    ctaLabel: 'Try Breathing',
    cardStyle: 'BLURRED_DARK_GLASS',
    quickTools: ['Sleep Mode', 'AI Chat', 'Journal'],
    questionIds: ['neg_q1', 'sad_q1', 'neg_q3'],
    crisisThreshold: false,
  },
  LONELY: {
    category: 'negative',
    emoji: '🥺',
    title: 'Lonely',
    subtitle: 'You are feeling isolated right now.',
    gradientHex: ['0xFFC4B5FD', '0xFF7C3AED'], // Purple 300 -> Violet 600
    illustrationId: 'anim_solo_star',
    ctaLabel: 'Seek Connection',
    cardStyle: 'BLURRED_DARK_GLASS',
    quickTools: ['AI Chat', 'Journal', 'Share Streak'],
    questionIds: ['lone_q1', 'neg_q2', 'lone_q2'],
    crisisThreshold: false,
  },
  ANGRY: {
    category: 'negative',
    emoji: '😡',
    title: 'Angry',
    subtitle: 'There is a lot of heated energy trapped inside you.',
    gradientHex: ['0xFFFCA5A5', '0xFFDC2626'], // Red 300 -> Red 600
    illustrationId: 'anim_fire',
    ctaLabel: 'Release Tension',
    cardStyle: 'BLURRED_DARK_GLASS',
    quickTools: ['Box Breathing', 'Venting Journal', 'Short Walk'],
    questionIds: ['ang_q1', 'ang_q2', 'neg_q2'],
    crisisThreshold: false,
  },
  STRESSED: {
    category: 'negative',
    emoji: '😫',
    title: 'Stressed',
    subtitle: 'The weight of everything is pressing down on you.',
    gradientHex: ['0xFFFDBA74', '0xFFEA580C'], // Orange 300 -> Orange 600
    illustrationId: 'anim_heavy_weight',
    ctaLabel: 'Reduce Load',
    cardStyle: 'BLURRED_DARK_GLASS',
    quickTools: ['Box Breathing', 'AI Chat', 'Focus Reset'],
    questionIds: ['str_q1', 'str_q2', 'neg_q2'],
    crisisThreshold: false,
  },
  BURNED_OUT: {
    category: 'negative',
    emoji: '😩',
    title: 'Burned Out',
    subtitle: 'Your energy appears depleted and stretched extremely thin.',
    gradientHex: ['0xFFF97316', '0xFF78350F'], // Orange -> Dark Amber
    illustrationId: 'anim_low_battery',
    ctaLabel: 'Recovery Mode',
    cardStyle: 'FADING_ORANGE_GLASS',
    quickTools: ['Recovery Plan', 'Sleep Mode', 'Focus Reset'],
    questionIds: ['bo_q1', 'bo_q2', 'bo_q3', 'bo_q4'],
    crisisThreshold: true, // Becomes true if intensity is extreme
  },
  ANXIOUS: {
    category: 'negative',
    emoji: '😟',
    title: 'Anxious',
    subtitle: 'Your mind may be moving faster than your body can keep up.',
    gradientHex: ['0xFFA78BFA', '0xFF4C1D95'], // Indigo -> Deep Navy
    illustrationId: 'anim_floating_particles',
    ctaLabel: 'Ground Yourself',
    cardStyle: 'PURPLE_GLOW_GLASS',
    quickTools: ['Moon Breathing', '5-4-3-2-1 Grounding', 'Rain Sounds'],
    questionIds: ['anx_q1', 'anx_q2', 'anx_q3', 'anx_q4'],
    crisisThreshold: true, // Evaluated based on answers
  },

  // ==========================================
  // CRITICAL MOODS
  // ==========================================
  DEPRESSED: {
    category: 'critical',
    emoji: '😞',
    title: 'Depressed',
    subtitle: 'You may be feeling disconnected, exhausted, or emotionally heavy.',
    gradientHex: ['0xFF4B5563', '0xFF111827'], // Gray 600 -> Gray 900
    illustrationId: 'anim_empty_room',
    ctaLabel: 'Get Support',
    cardStyle: 'DARK_MUTED_GLASS',
    quickTools: ['Crisis Support', 'Therapist Card', 'Safe Contact'],
    questionIds: ['dep_q1', 'dep_q2', 'dep_q3', 'dep_q4'],
    crisisThreshold: true,
  },
  PANIC: {
    category: 'critical',
    emoji: '😨',
    title: 'Panic',
    subtitle: 'Your nervous system is overwhelmed right now.',
    gradientHex: ['0xFFEF4444', '0xFF7F1D1D'], // Red 500 -> Dark Red
    illustrationId: 'anim_erratic_waves',
    ctaLabel: 'Emergency Grounding',
    cardStyle: 'HIGH_CONTRAST_CRISIS',
    quickTools: ['Rescue Breathing', 'Crisis Support', 'Safe Contact'],
    questionIds: ['pan_q1', 'pan_q2', 'pan_q3'],
    crisisThreshold: true,
  },
  UNSAFE: {
    category: 'critical',
    emoji: '💔',
    title: 'Unsafe',
    subtitle: 'Your safety is our absolute priority.',
    gradientHex: ['0xFFDC2626', '0xFF450A0A'], // Red 600 -> Deep Red
    illustrationId: 'anim_alert',
    ctaLabel: 'Call For Help',
    cardStyle: 'HIGH_CONTRAST_CRISIS',
    quickTools: ['Crisis Support', 'Call Hotline', 'Safe Contact'],
    questionIds: ['safe_q1', 'safe_q2'],
    crisisThreshold: true,
  },
  HOPELESS: {
    category: 'critical',
    emoji: '🥀',
    title: 'Hopeless',
    subtitle: 'The darkness feels heavy right now. Please hold on.',
    gradientHex: ['0xFF374151', '0xFF000000'], // Gray 700 -> Black
    illustrationId: 'anim_wilted_flower',
    ctaLabel: 'Find Light',
    cardStyle: 'HIGH_CONTRAST_CRISIS',
    quickTools: ['Crisis Support', 'Therapist Card', 'Call Hotline'],
    questionIds: ['dep_q3', 'dep_q4', 'safe_q1'],
    crisisThreshold: true,
  },
};

// Sub-registry mapping Question IDs to actual prompt text
export const MOOD_QUESTION_BANK = {
  // Positive
  pos_q1: "What made today feel good?",
  pos_q2: "Who did you spend time with?",
  pos_q3: "What are you grateful for?",
  calm_q1: "What helped you find your center?",
  calm_q2: "How can you protect this feeling?",
  grat_q1: "What is one small thing bringing you joy?",
  grat_q2: "Who are you appreciating right now?",
  
  // Neutral
  neu_q1: "What is on your mind today?",
  neu_q2: "How was your energy and sleep?",
  neu_q3: "Did you have any focus blocks?",
  tired_q1: "Did you get enough uninterrupted sleep?",
  tired_q2: "Are you pushing yourself too hard?",
  dist_q1: "What is pulling your attention away?",
  dist_q2: "Are you feeling overwhelmed by tasks?",
  numb_q1: "Are you avoiding something specific?",
  
  // Negative
  neg_q1: "What do you think is causing this?",
  neg_q2: "How intense is this feeling?",
  neg_q3: "Did something happen today?",
  sad_q1: "What is making you feel sad?",
  lone_q1: "When did you last connect with someone?",
  lone_q2: "Is there someone you can text right now?",
  ang_q1: "What triggered this anger?",
  ang_q2: "Where do you feel this in your body?",
  str_q1: "What is the biggest source of pressure?",
  str_q2: "Is this within your control?",
  bo_q1: "Are you mentally exhausted?",
  bo_q2: "Have you been working too much?",
  bo_q3: "Are you sleeping enough?",
  bo_q4: "Do you feel emotionally drained?",
  anx_q1: "What are you worried about?",
  anx_q2: "Are you feeling restless?",
  anx_q3: "Are you safe right now?",
  anx_q4: "Are you having racing thoughts?",
  
  // Critical
  dep_q1: "How long have you been feeling this way?",
  dep_q2: "Have you lost interest in activities?",
  dep_q3: "Do you feel hopeless?",
  dep_q4: "Are you having thoughts of harming yourself?",
  pan_q1: "Are you feeling shortness of breath?",
  pan_q2: "Is your heart racing?",
  pan_q3: "Can you focus on 5 things you can see?",
  safe_q1: "Are you safe right now?",
  safe_q2: "Do you have a plan to hurt yourself?",
};
