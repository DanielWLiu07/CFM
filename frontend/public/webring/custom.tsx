/**
 * CFM Webring custom widget starter
 * Download/copy this file and edit it in your own site codebase.
 */
export default function CFMWebringWidget() {
  // Must exactly match your `url` value in CFM `members.json`.
  const myUrl = "https://yoursite.com";
  const ringBase = "https://cfm-webring.vercel.app";

  const panther = "/webring/cfm-panther-black.svg";
  // Alternatives:
  // const panther = "/webring/cfm-panther-white.svg";
  // const panther = "/webring/cfm-panther-green.svg";

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <a
        href={`${ringBase}/#${encodeURIComponent(myUrl)}?nav=prev`}
        aria-label="Previous in CFM Webring"
        style={{ textDecoration: "none", color: "inherit", fontSize: "24px" }}
      >
        ←
      </a>

      <a
        href="https://uwaterloocfm.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="CFM Webring Hub"
      >
        <img src={panther} alt="CFM Webring Hub" style={{ width: "44px", display: "block" }} />
      </a>

      <a
        href={`${ringBase}/#${encodeURIComponent(myUrl)}?nav=next`}
        aria-label="Next in CFM Webring"
        style={{ textDecoration: "none", color: "inherit", fontSize: "24px" }}
      >
        →
      </a>
    </div>
  );
}
