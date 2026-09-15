"use client";

import React from "react";
import {
  UserCheck,
  Code2,
  Wrench,
  Database,
  Tag,
  Briefcase,
  GraduationCap,
  FolderGit2,
  AlertCircle,
  RotateCw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateProfile } from "@/types/intake";

interface CandidateProfileViewProps {
  profile: CandidateProfile;
  onReanalyze: () => void;
  onReplace: () => void;
  onContinue: () => void;
  isReanalyzing?: boolean;
}

export function CandidateProfileView({
  profile,
  onReanalyze,
  onReplace,
  onContinue,
  isReanalyzing = false,
}: CandidateProfileViewProps) {
  const { summary, skills, experience, education, projects } = profile;

  const hasAnySkills =
    skills &&
    (skills.programming_languages.length > 0 ||
      skills.frameworks_tools.length > 0 ||
      skills.databases_cloud.length > 0 ||
      skills.other.length > 0);

  return (
    <div className="space-y-6 pt-2 animate-fade-in" aria-label="Candidate profile review">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-electric-blue text-white shadow-xs">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-navy-900">Candidate Profile</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                <Sparkles className="h-3 w-3 text-green-600" />
                Understood & Extracted
              </span>
            </div>
            <p className="text-xs text-navy-600 mt-0.5">
              Strictly grounded in your resume text without evaluation or speculative scoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReanalyze}
            loading={isReanalyzing}
            disabled={isReanalyzing}
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5" />
            Re-analyse
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onReplace} disabled={isReanalyzing}>
            Replace
          </Button>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="p-4 rounded-lg border border-navy-200 bg-white space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
          Professional Summary
        </h4>
        {summary && summary.trim() ? (
          <p className="text-sm text-navy-800 leading-relaxed">{summary}</p>
        ) : (
          <div className="flex items-center gap-2 text-xs text-navy-400 italic">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Not found in this resume.</span>
          </div>
        )}
      </div>

      {/* Grouped Skills Section */}
      <div className="p-4 rounded-lg border border-navy-200 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
            Identified Competencies & Skills
          </h4>
          <span className="text-[11px] text-navy-400">Grouped by technical category</span>
        </div>

        {!hasAnySkills ? (
          <div className="flex items-center gap-2 text-xs text-navy-400 italic py-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Not found in this resume.</span>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Programming Languages */}
            <div className="p-3 rounded-md bg-navy-50/60 border border-navy-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-700">
                <Code2 className="h-3.5 w-3.5 text-electric-blue" />
                <span>Programming Languages</span>
              </div>
              {skills.programming_languages.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.programming_languages.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-900 border border-blue-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-400 italic">Not found in this resume.</p>
              )}
            </div>

            {/* Frameworks & Tools */}
            <div className="p-3 rounded-md bg-navy-50/60 border border-navy-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-700">
                <Wrench className="h-3.5 w-3.5 text-electric-blue" />
                <span>Frameworks & Libraries</span>
              </div>
              {skills.frameworks_tools.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.frameworks_tools.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-900 border border-indigo-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-400 italic">Not found in this resume.</p>
              )}
            </div>

            {/* Databases & Cloud */}
            <div className="p-3 rounded-md bg-navy-50/60 border border-navy-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-700">
                <Database className="h-3.5 w-3.5 text-electric-blue" />
                <span>Databases & Cloud Infrastructure</span>
              </div>
              {skills.databases_cloud.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.databases_cloud.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-900 border border-cyan-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-400 italic">Not found in this resume.</p>
              )}
            </div>

            {/* Other */}
            <div className="p-3 rounded-md bg-navy-50/60 border border-navy-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-700">
                <Tag className="h-3.5 w-3.5 text-electric-blue" />
                <span>Other Competencies & Tools</span>
              </div>
              {skills.other.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.other.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-navy-100 text-navy-800 border border-navy-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-400 italic">Not found in this resume.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Work Experience Section */}
      <div className="p-4 rounded-lg border border-navy-200 bg-white space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-electric-blue" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
            Work Experience
          </h4>
        </div>

        {!experience || experience.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-navy-400 italic py-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Not found in this resume.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {experience.map((exp, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-navy-100 bg-navy-50/40 space-y-1.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="font-semibold text-sm text-navy-900">
                    {exp.role}{" "}
                    <span className="font-normal text-navy-500">at {exp.company}</span>
                  </div>
                  {exp.dates && (
                    <span className="text-xs text-navy-500 font-medium sm:text-right">
                      {exp.dates}
                    </span>
                  )}
                </div>
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-navy-700 space-y-1 pl-1">
                    {exp.highlights.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div className="p-4 rounded-lg border border-navy-200 bg-white space-y-3">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-4 w-4 text-electric-blue" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
            Projects & Practical Work
          </h4>
        </div>

        {!projects || projects.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-navy-400 italic py-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Not found in this resume.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-navy-100 bg-navy-50/40 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="font-semibold text-sm text-navy-900">{proj.name}</span>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {proj.technologies.map((tech, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {proj.highlights && proj.highlights.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-navy-700 space-y-1 pl-1">
                    {proj.highlights.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Education Section */}
      <div className="p-4 rounded-lg border border-navy-200 bg-white space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-electric-blue" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
            Education
          </h4>
        </div>

        {!education || education.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-navy-400 italic py-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Not found in this resume.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {education.map((edu, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-navy-100 bg-navy-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <div>
                  <p className="font-semibold text-sm text-navy-900">{edu.institution}</p>
                  {edu.degree && <p className="text-xs text-navy-600 mt-0.5">{edu.degree}</p>}
                </div>
                {edu.dates && (
                  <span className="text-xs text-navy-500 font-medium">{edu.dates}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Continue Action */}
      <div className="flex items-center justify-end pt-3 border-t border-navy-200">
        <Button type="button" onClick={onContinue} size="default">
          Continue to Target Job
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
