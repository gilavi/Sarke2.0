import { Brand } from '../components/Brand';

export function SuccessPage() {
  return (
    <div className="app">
      <Brand />
      <div className="card center-card">
        <div className="icon-circle icon-success">✓</div>
        <h1 className="title">ხელი მოწერილია</h1>
        <p className="subtitle">
          მადლობა! ექსპერტი მიიღებს შეტყობინებას თქვენი ხელმოწერის შესახებ.
        </p>
        <p className="meta" style={{ marginTop: 4 }}>
          ამ გვერდის დახურვა შეიძლება.
        </p>
      </div>
    </div>
  );
}
