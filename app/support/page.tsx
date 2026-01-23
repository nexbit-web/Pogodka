"use client";

import React from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import * as Yup from "yup";
import { Footer } from "@/components/shared/Footer";

// Валідація
const SupportSchema = Yup.object({
  email: Yup.string().email("Невірний email").required("Email обовʼязковий"),
  subject: Yup.string()
    .min(3, "Мінімум 3 символи")
    .max(100, "Максимум 100 символів")
    .required("Тема обовʼязкова"),
  message: Yup.string()
    .min(10, "Мінімум 10 символів")
    .max(1000, "Максимум 1000 символів")
    .required("Повідомлення обовʼязкове"),
});

export default function SupportPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [errors, setErrors] = React.useState({
    email: "",
    subject: "",
    message: "",
  });
  const [touched, setTouched] = React.useState({
    email: false,
    subject: false,
    message: false,
  });
  const [isValid, setIsValid] = React.useState(false);

  // Проверка валидности через Yup
  React.useEffect(() => {
    async function validate() {
      try {
        await SupportSchema.validate(
          { email, subject, message },
          { abortEarly: false },
        );
        setErrors({ email: "", subject: "", message: "" });
        setIsValid(true);
      } catch (err: any) {
        const newErrors: any = { email: "", subject: "", message: "" };
        if (err.inner) {
          err.inner.forEach((e: any) => {
            newErrors[e.path] = e.message;
          });
        }
        setErrors(newErrors);
        setIsValid(false);
      }
    }
    validate();
  }, [email, subject, message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });

      if (!res.ok) throw new Error();
      router.replace("/");
      setEmail("");
      setSubject("");
      setMessage("");
      toast.success("Готово! Повідомлення надіслано.");
    } catch {
      toast.error("Помилка відправки.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        {/* Email */}
        <Field
          data-invalid={!!errors.email && touched.email}
          className="w-full max-w-md"
        >
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            aria-invalid={!!errors.email && touched.email}
          />

          <FieldDescription
            className={touched.email && errors.email ? "text-red-600" : ""}
          >
            {touched.email && errors.email
              ? errors.email
              : "Введіть email, куди нам надіслати відповідь."}
          </FieldDescription>
        </Field>

        {/* Subject */}
        <Field
          data-invalid={!!errors.subject && touched.subject}
          className="w-full max-w-md"
        >
          <FieldLabel>Тема повідомлення</FieldLabel>
          <Input
            type="text"
            placeholder="Тема"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, subject: true }))}
            aria-invalid={!!errors.subject && touched.subject}
          />
          <FieldDescription
            className={touched.subject && errors.subject ? "text-red-600" : ""}
          >
            {touched.subject && errors.subject
              ? errors.subject
              : "Введіть тему повідомлення"}{" "}
          </FieldDescription>
        </Field>

        {/* Message */}
        <Field
          data-invalid={!!errors.message && touched.message}
          className="w-full max-w-md"
        >
          <FieldLabel>Ваше питання</FieldLabel>
          <Textarea
            placeholder="Введіть тут своє повідомлення."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, message: true }))}
            aria-invalid={!!errors.message && touched.message}
          />

          <FieldDescription
            className={touched.message && errors.message ? "text-red-600" : ""}
          >
            {touched.message && errors.message
              ? errors.message
              : "Введіть тут своє питання."}
          </FieldDescription>
        </Field>

        {/* Submit Button */}
        <Field className="w-full max-w-md">
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || loading}
          >
            {loading ? (
              <>
                <Spinner className="size-6" /> Відправка...
              </>
            ) : (
              "Відправити"
            )}
          </Button>
        </Field>
      </FieldGroup>
      <Footer />
    </form>
  );
}
