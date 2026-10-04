import { generateResponse } from "../config/openRouter.js";
import { User } from "../models/userModel.js";
import { Website } from "../models/websiteModel.js";
import extractJson from "../utils/extractJson.js";

const masterPrompt = `
YOU ARE A PRINCIPAL FRONTEND ARCHITECT
AND A SENIOR UI/UX ENGINEER
SPECIALIZED IN RESPONSIVE DESIGN SYSTEMS.

YOU BUILD HIGH-END, REAL-WORLD, PRODUCTION-GRADE WEBSITES
USING ONLY HTML, CSS, AND JAVASCRIPT
THAT WORK PERFECTLY ON ALL SCREEN SIZES.

THE OUTPUT MUST BE CLIENT-DELIVERABLE WITHOUT ANY MODIFICATION.

❌ NO FRAMEWORKS
❌ NO LIBRARIES
❌ NO BASIC SITES
❌ NO PLACEHOLDERS
❌ NO NON-RESPONSIVE LAYOUTS

--------------------------------------------------
USER REQUIREMENT:
{USER_PROMPT}
--------------------------------------------------

GLOBAL QUALITY BAR (NON-NEGOTIABLE)
--------------------------------------------------
- Premium, modern UI (2026–2027)
- Professional typography & spacing
- Clean visual hierarchy
- Business-ready content (NO lorem ipsum)
- Smooth transitions & hover effects
- SPA-style multi-page experience
- Production-ready, readable code

--------------------------------------------------
RESPONSIVE DESIGN (ABSOLUTE REQUIREMENT)
--------------------------------------------------
THIS WEBSITE MUST BE FULLY RESPONSIVE.

YOU MUST IMPLEMENT:

✔ Mobile-first CSS approach
✔ Responsive layout for:
  - Mobile (<768px)
  - Tablet (768px–1024px)
  - Desktop (>1024px)

✔ Use:
  - CSS Grid / Flexbox
  - Relative units (%, rem, vw)
  - Media queries

✔ REQUIRED RESPONSIVE BEHAVIOR:
  - Navbar collapses / stacks on mobile
  - Sections stack vertically on mobile
  - Multi-column layouts become single-column on small screens
  - Images scale proportionally
  - Text remains readable on all devices
  - No horizontal scrolling on mobile
  - Touch-friendly buttons on mobile

IF THE WEBSITE IS NOT RESPONSIVE → RESPONSE IS INVALID.

--------------------------------------------------
IMAGES (MANDATORY & RESPONSIVE)
--------------------------------------------------
- Use high-quality images ONLY from:
  https://images.unsplash.com/
- EVERY image URL MUST include:
  ?auto=format&fit=crop&w=1200&q=80

- Images must:
  - Be responsive (max-width: 100%)
  - Resize correctly on mobile
  - Never overflow containers

--------------------------------------------------
TECHNICAL RULES (VERY IMPORTANT)
--------------------------------------------------
- Output ONE single HTML file
- Exactly ONE <style> tag
- Exactly ONE <script> tag
- NO external CSS / JS / fonts
- Use system fonts only
- iframe srcdoc compatible
- SPA-style navigation using JavaScript
- No page reloads
- No dead UI
- No broken buttons
--------------------------------------------------
SPA VISIBILITY RULE (MANDATORY)
--------------------------------------------------
- Pages MUST NOT be hidden permanently
- If .page { display: none } is used,
  then .page.active { display: block } is REQUIRED
- At least ONE page MUST be visible on initial load
- Hiding all content is INVALID


--------------------------------------------------
REQUIRED SPA PAGES
--------------------------------------------------
- Home
- About
- Services / Features
- Contact

--------------------------------------------------
FUNCTIONAL REQUIREMENTS
--------------------------------------------------
- Navigation must switch pages using JS
- Active nav state must update
- Forms must have JS validation
- Buttons must show hover + active states
- Smooth section/page transitions
- Build the user's requested product, not a decorative landing page that merely describes it.
- Every visible button, link, form, and control must perform its labeled action and produce a visible result.
- Never leave href="#" or placeholder controls without a working event handler.
- Ensure every JavaScript selector targets an element that exists, and register handlers after the DOM is available.
- Show useful success, error, empty, loading, and completion states where those states apply.
- Before returning the HTML, trace the primary user flow from its first action through its visible result and fix any dead or contradictory control logic.
- For games, implement a playable loop with an obvious start/restart action, visible score and game-over state, and working keyboard plus touch controls.
- For grid-direction games, block only the exact reverse move: reject a next direction only when both of its components equal the negatives of the current direction. Perpendicular turns must remain possible.
- Ensure game-over stops movement and restart resets all game state, score, and timers.

--------------------------------------------------
FINAL SELF-CHECK (MANDATORY)
--------------------------------------------------
BEFORE RESPONDING, ENSURE:

1. Layout works on mobile, tablet, desktop
2. No horizontal scroll on mobile
3. All images are responsive
4. All sections adapt properly
5. Media queries are present and used
6. Navigation works on all screen sizes
7. At least ONE page is visible without user interaction

IF ANY CHECK FAILS → RESPONSE IS INVALID

--------------------------------------------------
OUTPUT FORMAT (RAW JSON ONLY)
--------------------------------------------------
The code value is a JSON string. Escape all quotes, backslashes, tabs, and line breaks as required by JSON; never put literal unescaped line breaks inside a JSON string.
{
  "message": "Short professional confirmation sentence",
  "code": "<FULL VALID HTML DOCUMENT>"
}

--------------------------------------------------
ABSOLUTE RULES
--------------------------------------------------
- RETURN RAW JSON ONLY
- NO markdown
- NO explanations
- NO extra text
- FORMAT MUST MATCH EXACTLY
- IF FORMAT IS BROKEN → RESPONSE IS INVALID
`;

export const generateWebsite = async (req, res) => {
  try {
    const { prompt } = req.body
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" })
    }
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(400).json({ message: "User not found" })
    }

    if (user.credits < 10) {
      return res.status(400).json({ message: "You have not enough credits to generate a website" })
    }

    const finalPrompt = masterPrompt.replace("USER_PROMPT", prompt)
    let raw = ""
    let parsed = null
    for (let i = 0; i < 2 && !parsed; i++) {
      raw = await generateResponse(finalPrompt)
      parsed = await extractJson(raw)

      if (!parsed) {
        raw = await generateResponse(finalPrompt + "\n\nRETURN ONLY RAW JSON")
        parsed = await extractJson(raw)
      }
    }
        if (!parsed?.code) {
      return res.status(400).json({ message: "AI returned invalid response" })
    }
    const website = await Website.create({
      user: user._id,
      title: prompt.slice(0, 60),
      latestCode: parsed.code,
      conversation: [
        { role: "user", content: prompt },
        { role: "ai", content: parsed.message }
      ]
    })
    user.credits = user.credits - 10
    await user.save()
    return res.status(201).json({
      websiteId: website._id,
      remainingCredits: user.credits
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export const getWebsiteById = async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    if (!website) {
      return res.status(400).json({ message: "Website not found" })
    }
    return res.status(200).json(website)
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export const changeWebsite = async (req, res) => {
  try {
    const { prompt } = req.body
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" })
    }
    const website = await Website.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    if (!website) {
      return res.status(400).json({ message: "Website not found" })
    }
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(400).json({ message: "User not found" })
    }

    if (user.credits < 5) {
      return res.status(400).json({ message: "You have not enough credits to generate a website" })
    }

    const udpatePrompt = `
    UPDATE THIS HTML WEBSITE.
    
    CURRENT CODE:
    ${website.latestCode}

    USER REQUEST:
    ${prompt}

    PRESERVE EXISTING FUNCTIONALITY:
    - Keep all existing working buttons, navigation, forms, game logic, keyboard/touch controls, and event handlers unless the user explicitly asks to change them.
    - Do not replace functional interactions with decorative or placeholder elements.
    - Ensure every visible control still performs its labeled action after the edit.
    - Check that event handlers reference elements and IDs that exist in the returned HTML.
    - Return the complete updated HTML document and valid JSON only.
    - JSON-escape every quote, backslash, tab, and line break in the code string. Do not place literal unescaped line breaks inside a JSON string.

    RETURN RAW JSON ONLY:
    {
      "message":"Short confirmation",
      "code":"<UPDATE FULL HTML>"
    }
    `

    let parsed = null
    const currentCode = website.latestCode || ""
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      const attemptPrompt = attempt === 0
        ? udpatePrompt
        : `${udpatePrompt}\n\nYour previous response did not apply a code change. Implement the user's requested change directly in the HTML, CSS, or JavaScript. Return the full updated HTML in valid JSON.`
      let raw = await generateResponse(attemptPrompt)
      parsed = await extractJson(raw)

      if (!parsed?.code || parsed.code.trim() === currentCode.trim()) {
        raw = await generateResponse(`${attemptPrompt}\n\nRETURN ONLY RAW JSON. The code string must contain the requested implementation and must not be identical to the current code.`)
        parsed = await extractJson(raw)
      }

      if (parsed?.code?.trim() === currentCode.trim()) parsed = null
    }
    if (!parsed?.code) {
      return res.status(422).json({ message: "The AI did not apply a code change. Your credits were not used; please describe the change more specifically and try again." })
    }

    website.conversation.push(
      { role: "user", content: prompt },
      { role: "ai", content: parsed.message },
    )

    website.latestCode = parsed.code
    await website.save()
    user.credits = user.credits - 5
    await user.save()
    return res.status(200).json({
      message: parsed.message,
      code: parsed.code,
      remainingCredits: user.credits
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export const getAllWebsite = async (req, res) => {
  try {
    const websites = await Website.find({ user: req.user._id })
    return res.status(200).json(websites)
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export const deployWebsite = async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      user: req.user._id
    })

    if (!website) {
      return res.status(400).json({ message: "Website not found" })
    }
    if (!website.slug) {
      website.slug = website.title.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0, 60) + website._id.toString().slice(-5)
    }

    if (!process.env.FRONTEND_URL) {
      return res.status(500).json({ message: "FRONTEND_URL is not configured on the backend" })
    }

    website.deployed = true
    website.deployUrl = new URL(`/site/${website.slug}`, process.env.FRONTEND_URL).toString()
    await website.save()

    return res.status(200).json({
      url: website.deployUrl
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export const getBySlug = async (req, res) => {
  try {  
    const website = await Website.findOne({
      slug: req.params.slug
    })
    if (!website) {
      return res.status(400).json({ message: "Website not found" })
    }
    return res.status(200).json(website)
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}