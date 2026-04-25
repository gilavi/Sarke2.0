import { Brand } from '../components/Brand';

export function DeclinedPage() {
  return (
    <div className="app">
      <Brand />
      <div className="card center-card">
        <div className="icon-circle icon-warn">!</div>
        <h1 className="title">უარი მიღებულია</h1>
        <p className="subtitle">
          ექსპერტი ხედავს, რომ ხელის მოწერაზე უარი თქვით. დაუკავშირდი მას შემდგომი ნაბიჯებისთვის.
        </p>
      </div>
    </div>
  );
}
