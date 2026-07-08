// Generic behavioral interview question bank.
//
// These are evergreen, company-agnostic questions — the kind that appear in
// almost every behavioral interview. They are organized around Amazon's
// Leadership Principles, which double as a broadly useful taxonomy for
// behavioral questions at any company, plus a set of classic warm-up questions.
//
// This bank is intentionally static (not DB-backed): the questions rarely
// change, they carry no per-user resume context, and keeping them in the repo
// makes them version-controlled and easy to edit. Reps still save fine because
// `reps.prompt_id` is an unconstrained text column.

export type BehavioralQuestion = {
  id: string;
  category: string;
  text: string;
  timeLimitSeconds: number;
  wordLimit: number;
  isStar: boolean; // whether a STAR-structured answer is expected
};

export type BehavioralCategory = {
  name: string;
  blurb: string;
  questions: BehavioralQuestion[];
};

const DEFAULT_TIME = 120;
const DEFAULT_WORDS = 300;

function q(
  id: string,
  category: string,
  text: string,
  isStar: boolean
): BehavioralQuestion {
  return {
    id,
    category,
    text,
    timeLimitSeconds: DEFAULT_TIME,
    wordLimit: DEFAULT_WORDS,
    isStar,
  };
}

export const BEHAVIORAL_CATEGORIES: BehavioralCategory[] = [
  {
    name: "General & Warm-up",
    blurb:
      "The classic openers and self-reflection questions that start almost every interview. Not strictly STAR, but structure your answer and land a clear message.",
    questions: [
      q("beh-general-tell-me-about-yourself", "General & Warm-up", "Tell me about yourself.", false),
      q("beh-general-walk-through-resume", "General & Warm-up", "Walk me through your resume.", false),
      q("beh-general-why-this-role", "General & Warm-up", "Why are you interested in this role?", false),
      q("beh-general-why-this-company", "General & Warm-up", "Why do you want to work at this company?", false),
      q("beh-general-next-role", "General & Warm-up", "What are you looking for in your next role?", false),
      q("beh-general-strength", "General & Warm-up", "What is your greatest strength?", false),
      q("beh-general-weakness", "General & Warm-up", "What is your biggest weakness, and how are you working on it?", false),
      q("beh-general-five-years", "General & Warm-up", "Where do you see yourself in five years?", false),
      q("beh-general-why-leaving", "General & Warm-up", "Why are you leaving your current role?", false),
    ],
  },
  {
    name: "Customer Obsession",
    blurb:
      "Leaders start with the customer and work backwards. They earn and keep customer trust.",
    questions: [
      q("beh-lp-customer-obsession", "Customer Obsession", "Tell me about a time you used customer feedback to drive a meaningful improvement, even when it was inconvenient to do so.", true),
    ],
  },
  {
    name: "Ownership",
    blurb:
      "Leaders act on behalf of the whole company, beyond just their own team. They never say “that's not my job.”",
    questions: [
      q("beh-lp-ownership", "Ownership", "Describe a time you took on something significant that was outside your job description because it needed to get done.", true),
    ],
  },
  {
    name: "Invent and Simplify",
    blurb:
      "Leaders expect and require innovation and invention, and always find ways to simplify.",
    questions: [
      q("beh-lp-invent-and-simplify", "Invent and Simplify", "Tell me about a time you invented a new solution or simplified a complex process.", true),
    ],
  },
  {
    name: "Are Right, A Lot",
    blurb:
      "Leaders have strong judgment and good instincts. They seek diverse perspectives and work to disconfirm their beliefs.",
    questions: [
      q("beh-lp-are-right-a-lot", "Are Right, A Lot", "Describe a time you had to make a decision with incomplete information. How did you reach it, and how did it turn out?", true),
    ],
  },
  {
    name: "Learn and Be Curious",
    blurb:
      "Leaders are never done learning and always seek to improve themselves.",
    questions: [
      q("beh-lp-learn-and-be-curious", "Learn and Be Curious", "Tell me about a time you taught yourself a new skill or concept to solve a problem.", true),
    ],
  },
  {
    name: "Hire and Develop the Best",
    blurb:
      "Leaders raise the performance bar with every hire and promotion, and develop others.",
    questions: [
      q("beh-lp-hire-and-develop", "Hire and Develop the Best", "Describe a time you mentored someone or helped a teammate grow. What did you do and what was the result?", true),
    ],
  },
  {
    name: "Insist on the Highest Standards",
    blurb:
      "Leaders have relentlessly high standards and drive their teams to deliver high-quality work.",
    questions: [
      q("beh-lp-highest-standards", "Insist on the Highest Standards", "Tell me about a time you refused to compromise on quality despite pressure to ship or move on.", true),
    ],
  },
  {
    name: "Think Big",
    blurb:
      "Leaders create and communicate a bold direction that inspires results. They think differently.",
    questions: [
      q("beh-lp-think-big", "Think Big", "Describe a time you proposed a bold, ambitious idea. How did you get others to buy in?", true),
    ],
  },
  {
    name: "Bias for Action",
    blurb:
      "Speed matters in business. Many decisions are reversible and do not need extensive study.",
    questions: [
      q("beh-lp-bias-for-action", "Bias for Action", "Tell me about a time you made a decision quickly under time pressure and uncertainty. How did you weigh speed against risk?", true),
    ],
  },
  {
    name: "Frugality",
    blurb:
      "Accomplish more with less. Constraints breed resourcefulness, self-sufficiency, and invention.",
    questions: [
      q("beh-lp-frugality", "Frugality", "Describe a time you accomplished something significant with very limited resources.", true),
    ],
  },
  {
    name: "Earn Trust",
    blurb:
      "Leaders listen attentively, speak candidly, and treat others respectfully. They are vocally self-critical.",
    questions: [
      q("beh-lp-earn-trust", "Earn Trust", "Tell me about a time you had to rebuild trust with a colleague or stakeholder after a mistake or setback.", true),
    ],
  },
  {
    name: "Dive Deep",
    blurb:
      "Leaders operate at all levels, stay connected to the details, and audit frequently.",
    questions: [
      q("beh-lp-dive-deep", "Dive Deep", "Describe a time you dug into the details of a problem that others had overlooked. What did you find?", true),
    ],
  },
  {
    name: "Have Backbone; Disagree and Commit",
    blurb:
      "Leaders respectfully challenge decisions when they disagree, then fully commit once a decision is made.",
    questions: [
      q("beh-lp-backbone", "Have Backbone; Disagree and Commit", "Tell me about a time you strongly disagreed with your manager or team. What did you do, and how did it end?", true),
    ],
  },
  {
    name: "Deliver Results",
    blurb:
      "Leaders focus on the key inputs and deliver them with the right quality and in a timely fashion.",
    questions: [
      q("beh-lp-deliver-results", "Deliver Results", "Describe a time you delivered a critical result despite significant obstacles or setbacks.", true),
    ],
  },
  {
    name: "Strive to be Earth's Best Employer",
    blurb:
      "Leaders work to create a safer, more productive, higher-performing, and more inclusive work environment.",
    questions: [
      q("beh-lp-best-employer", "Strive to be Earth's Best Employer", "Tell me about a time you improved your team's working environment or supported a colleague who was struggling.", true),
    ],
  },
  {
    name: "Success and Scale Bring Broad Responsibility",
    blurb:
      "Leaders consider the broader consequences of their actions on customers, communities, and the world.",
    questions: [
      q("beh-lp-broad-responsibility", "Success and Scale Bring Broad Responsibility", "Describe a time you considered the broader impact of a decision beyond your immediate goals or metrics.", true),
    ],
  },
];

// Flat lookup list.
export const BEHAVIORAL_QUESTIONS: BehavioralQuestion[] =
  BEHAVIORAL_CATEGORIES.flatMap((c) => c.questions);

export function getBehavioralQuestionById(
  id: string
): (BehavioralQuestion & { categoryBlurb: string }) | null {
  for (const cat of BEHAVIORAL_CATEGORIES) {
    const found = cat.questions.find((qq) => qq.id === id);
    if (found) return { ...found, categoryBlurb: cat.blurb };
  }
  return null;
}
