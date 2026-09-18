export function guestCoachReply(question: string): string {
  const normalized = question.toLowerCase();
  if (normalized.includes('protein')) {
    return 'For general guidance, include a protein source in each main meal—such as eggs, yogurt, beans, tofu, fish, or chicken—and pair it with produce and a satisfying carbohydrate. Sign in if you want Coach to review your actual protein records.';
  }
  if (normalized.includes('hydration') || normalized.includes('water')) {
    return 'A simple general habit is to keep water nearby and drink regularly with meals and between them. Thirst, activity, heat, and health conditions can change what is appropriate. Sign in if you want Coach to use your logged hydration.';
  }
  if (normalized.includes('dinner') || normalized.includes('meal')) {
    return 'For an easy balanced meal, combine a protein, a colorful vegetable, and a filling carbohydrate, then add a source of flavor you enjoy. Sign in to get suggestions based on your plan and saved recipes.';
  }
  if (normalized.includes('focus') || normalized.includes('today')) {
    return 'A useful general focus is one balanced meal, regular hydration, and a small choice you can repeat tomorrow. I cannot see your personal records in guest mode, so sign in for a tailored read.';
  }
  return 'I can answer general nutrition questions in guest mode, but I cannot see your calories, protein, hydration, meals, or history. Sign in to unlock personalized Coach guidance.';
}