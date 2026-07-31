import Link from "next/link";

import { QuizCard } from "@/components/quiz-card";
import { Button, Card, EmptyState } from "@/components/ui";
import { getReviewQueue, getToday, pickQuestionForConcept } from "@/db/queries";
import { sortByPriority } from "@/lib/srs";

export const dynamic = "force-dynamic";

export const metadata = { title: "Review · Tuning Fork" };

/**
 * The review session.
 *
 * Deliberately server-driven and stateless: each render serves the single most
 * urgent concept, and answering revalidates so the next one appears. There is
 * no client-side queue to fall out of sync with the database, and closing the
 * tab mid-session loses nothing.
 */
export default async function ReviewPage() {
  const today = await getToday();
  const queue = await getReviewQueue(today);

  if (queue.length === 0) {
    return (
      <>
        <header className="mb-5 flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
          <Link href="/theory" className="text-sm text-ink-muted underline-offset-4 hover:underline">
            Curriculum
          </Link>
        </header>
        <EmptyState
          title="Nothing due"
          body="Every concept with questions is scheduled for a later date. Come back when something falls due, or reset a concept from the curriculum to drill it again."
          action={
            <Link href="/theory">
              <Button>Back to curriculum</Button>
            </Link>
          }
        />
      </>
    );
  }

  // Weakest and most overdue first.
  const [next] = sortByPriority(queue);
  const question = await pickQuestionForConcept(next.id);

  if (!question) {
    return (
      <Card>
        <p className="text-sm text-ink-muted">
          {next.title} has no questions yet. Add some and it will enter the queue.
        </p>
      </Card>
    );
  }

  const choices = Array.isArray(question.choices) ? question.choices : [];

  return (
    <>
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <Link href="/theory" className="text-sm text-ink-muted underline-offset-4 hover:underline">
          Curriculum
        </Link>
      </header>

      <QuizCard
        key={question.id}
        questionId={question.id}
        conceptId={next.id}
        conceptTitle={next.title}
        prompt={question.prompt}
        choices={choices}
        remaining={queue.length}
      />
    </>
  );
}
