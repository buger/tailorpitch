// Public marketing copy; prices are proposals, never billing entitlements.
export const marketing = {
  title: "TailorPitch — Find the right leads. Make every pitch personal.",
  audience: "AI PROSPECTING, FROM YOUR OFFER TO YOUR OUTREACH",
  headline: ["Find the right leads.", "Make every pitch personal."],
  description:
    "Start with your website. TailorPitch analyzes your offer, helps define your ideal customers, then finds and qualifies leads. Create personalized pages and outreach for the ones you choose.",
  sourceLine:
    "Connect your lead sources. Add companies manually. Keep the final say.",
  primaryCta: "Join early access",
  secondaryCta: "Explore the full workflow",
  offer: "100 researched leads + 10 personalized pages.",
  priceNote: "Proposed from $99/month. No card. No payment today.",
  metaDescription:
    "Analyze your offer, define ICPs, find and qualify leads, then create personalized pages and outreach. Connect supported sources or add companies manually. Join early access.",
  mechanismTitle:
    "Your offer is the starting point. A personal pitch is the result.",
  proofTitle: "Built around a more considered approach to outreach.",
  offerTitle: "One workflow. A manageable shortlist.",
  steps: [
    {
      id: "offer",
      label: "Analyze your offer",
      title: "Start with what makes your business worth choosing.",
      description:
        "Share your website. TailorPitch analyzes your proposition, real website copy and brand to suggest your offer and voice. Review and refine them before saving.",
      output: "Your proposition, brand and voice",
    },
    {
      id: "icp",
      label: "Define your ICPs",
      title: "Give your prospecting a clear idea of who fits.",
      description:
        "Turn your offer into suggested ideal customer profiles. Refine industries, company size, roles, keywords, signals and exclusions. You decide what a good-fit customer looks like.",
      output: "Customer profiles you can review and edit",
    },
    {
      id: "find",
      label: "Find leads",
      title: "Choose where your next leads come from.",
      description:
        "Use connected discovery sources to find companies against your profile. Connect supported tools, research a company website or GitHub link, or add a lead manually. Set a discovery pace that fits your capacity.",
      output: "A queue of companies with source context",
    },
    {
      id: "qualify",
      label: "Qualify the fit",
      title: "Understand the fit before you spend time on the pitch.",
      description:
        "Research each company against your criteria. Review source-backed facts, fit, relevant signals and unanswered questions. Choose which researched leads deserve a personalized page.",
      output: "Research, fit criteria and your selected prospects",
    },
    {
      id: "page",
      label: "Personalize the page",
      title: "Make your offer specific to their company.",
      description:
        "Generate a personal landing page from the selected company’s research and your saved brand. Explain why your offer is relevant, propose a starting point, then edit and publish when ready.",
      output: "An editable, shareable page for that prospect",
    },
    {
      id: "outreach",
      label: "Prepare outreach",
      title: "Start the conversation with the context already in place.",
      description:
        "Prepare a message in your voice that links to the published page. Review the exact email before sending, or take your LinkedIn and X drafts to those channels yourself.",
      output: "A relevant first message, ready for your review",
    },
  ],
  faqs: [
    [
      "Is this a lead finder or a landing-page builder?",
      "It connects the whole workflow. Start with your offer and ideal customer profiles, find companies through connected sources or add them yourself, qualify the fit, then prepare personalized pages and outreach for your selected prospects.",
    ],
    [
      "Can I bring my own lead sources?",
      "Yes. Use included Apify sourcing, connect Gojiberry or Manus with your own authorized account, add a company manually, or research a public website or GitHub link. Optional third-party subscriptions and usage fees are separate from TailorPitch’s proposed plans.",
    ],
    [
      "What happens when I join early access?",
      "You join the email list for access announcements and product updates. No card is collected and no subscription starts. Signup does not automatically grant a company workspace. There is no confirmed access date yet.",
    ],
    [
      "How much control do I have?",
      "Review the suggested offer and ICPs, set your discovery pace, and choose the researched leads that get a page. Edit pages and messages before publishing or sending. LinkedIn and X provide drafts for manual outreach, not automatic social delivery.",
    ],
    [
      "What does the proposed $99 plan include?",
      "Up to 100 researched leads and 10 personalized pages per month, with both allowances included. Website-led setup, editable customer profiles, saved-draft editing and outreach drafts are proposed to be included. Managed Apify sourcing is included. Final pricing may change; optional third-party fees are separate.",
    ],
    [
      "Will TailorPitch guarantee replies or meetings?",
      "No. TailorPitch helps you choose prospects and prepare relevant pages and messages; it cannot guarantee replies, meetings or sales. Your offer, audience and follow-through still matter.",
    ],
  ],
} as const;
