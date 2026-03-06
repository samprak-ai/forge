import { redirect } from "next/navigation";

// Interview prep is now part of the unified Prompt Library
export default function InterviewPrepPage() {
  redirect("/prompts");
}
