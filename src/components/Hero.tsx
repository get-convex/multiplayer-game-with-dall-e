import styles from "./Hero.module.scss";

const Hero = () => (
  <header className={styles.header}>
    <img className={styles.faces} src="/faces.svg" alt="Cartoon faces" />
    <h1 className={styles.title}>Whose Prompt is it Anyways?</h1>
    <span className={styles.convex}>
      by <img src="/convex.svg" width="28" height="28" />{" "}
      <a href="https://convex.dev">Convex</a>
    </span>
  </header>
);

export default Hero;
