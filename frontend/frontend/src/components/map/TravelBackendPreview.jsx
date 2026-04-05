export default function TravelBackendPreview({ payload }) {
  return (
    <section className="travel-map__card">
      <div className="travel-map__card-header">
        <div>
          <p className="travel-map__eyebrow">Backend Preview</p>
          <h2>Node.js + MongoDB ready</h2>
        </div>
      </div>

      <p className="travel-map__copy">
        This JSON structure can be sent directly to your backend for itinerary storage.
      </p>

      <pre className="travel-map__code">{JSON.stringify(payload, null, 2)}</pre>
    </section>
  );
}
