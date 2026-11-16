import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="split">
      <div>
        <h1>No twin yet</h1>
        <p className="lede">That page is not in the pool.</p>
        <div className="actions">
          <Link className="btn btn-lime" href="/">
            Find my twin
          </Link>
        </div>
      </div>
    </section>
  );
}
