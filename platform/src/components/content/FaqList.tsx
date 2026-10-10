type Faq = { question: string; answer: string };

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="faq-list">
      {faqs.map((faq) => (
        <details key={faq.question}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
