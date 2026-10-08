import NotFound from "../not-found";

export const metadata = {
  title: "404 - Page Not Found | Mocky",
  description: "The page you are looking for could not be found.",
};

export default function Custom404Page() {
  return <NotFound />;
}
