import { Icon } from "@/components/icons/Icon";

type Faq = { question: string; answer: string };

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="faq-list">
      {faqs.map((faq, i) => (
        <details key={faq.question} open={i === 0}>
          <summary>
            {faq.question}
            <Icon name="plus" />
          </summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
