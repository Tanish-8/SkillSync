import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Info,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  validateEmail,
  validateRegistrationEmail,
  validateSignInEmail,
} from '../utils/emailValidation';
import { useAuth } from '../context/AuthContext';

export function AuthPage({ theme, toggleTheme }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();

  // Canonical mode from URL query param: 'signin' | 'signup'
  const modeParam = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Refs for tracking animation and state synchronization
  const currentModeRef = useRef(modeParam);
  const isAnimatingRef = useRef(false);
  const activeTimelineRef = useRef(null);

  // DOM references for GSAP
  const containerRef = useRef(null);
  const bladeRef = useRef(null);
  const introSignInRef = useRef(null);
  const introSignUpRef = useRef(null);
  const signUpFormRef = useRef(null);
  const signInFormRef = useRef(null);

  // Form States - Sign In
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInErrors, setSignInErrors] = useState({});
  const [signInServerError, setSignInServerError] = useState(null);
  const [isSubmittingSignIn, setIsSubmittingSignIn] = useState(false);

  // Form States - Sign Up
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpErrors, setSignUpErrors] = useState({});
  const [signUpServerError, setSignUpServerError] = useState(null);
  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState(false);

  // Polygon coordinates for diagonal blade transition
  // Sign-In: Blade covers the LEFT half (slanted right at top)
  const CLIP_SIGNIN = 'polygon(0% 0%, 54% 0%, 42% 100%, 0% 100%)';
  // Sign-Up: Blade covers the RIGHT half (slanted left at bottom)
  const CLIP_SIGNUP = 'polygon(46% 0%, 100% 0%, 100% 100%, 58% 100%)';

  // Master GSAP Transition Function
  const transitionToMode = (targetMode) => {
    const isToSignUp = targetMode === 'signup';
    currentModeRef.current = targetMode;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const duration = prefersReducedMotion ? 0.01 : 0.75;
    isAnimatingRef.current = true;

    // Kill any in-flight timeline to prevent conflicts
    if (activeTimelineRef.current) {
      activeTimelineRef.current.kill();
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut', duration },
        onComplete: () => {
          isAnimatingRef.current = false;
          // Ensure deterministic settled states
          if (isToSignUp) {
            if (signUpFormRef.current) {
              signUpFormRef.current.style.visibility = 'visible';
              signUpFormRef.current.style.opacity = '1';
              signUpFormRef.current.style.pointerEvents = 'auto';
              signUpFormRef.current.setAttribute('aria-hidden', 'false');
            }
            if (signInFormRef.current) {
              signInFormRef.current.style.visibility = 'hidden';
              signInFormRef.current.style.opacity = '0';
              signInFormRef.current.style.pointerEvents = 'none';
              signInFormRef.current.setAttribute('aria-hidden', 'true');
            }
          } else {
            if (signInFormRef.current) {
              signInFormRef.current.style.visibility = 'visible';
              signInFormRef.current.style.opacity = '1';
              signInFormRef.current.style.pointerEvents = 'auto';
              signInFormRef.current.setAttribute('aria-hidden', 'false');
            }
            if (signUpFormRef.current) {
              signUpFormRef.current.style.visibility = 'hidden';
              signUpFormRef.current.style.opacity = '0';
              signUpFormRef.current.style.pointerEvents = 'none';
              signUpFormRef.current.setAttribute('aria-hidden', 'true');
            }
          }
        },
      });

      activeTimelineRef.current = tl;

      // 1. Animate blade clipPath across the container
      if (bladeRef.current) {
        tl.to(
          bladeRef.current,
          {
            clipPath: isToSignUp ? CLIP_SIGNUP : CLIP_SIGNIN,
          },
          0
        );
      }

      // 2. Cross-fade intro panel contents inside blade
      if (introSignInRef.current && introSignUpRef.current) {
        if (isToSignUp) {
          // Switching to Sign-Up (blade travels to the right)
          introSignUpRef.current.style.display = 'flex';
          introSignUpRef.current.style.pointerEvents = 'none';

          tl.to(
            introSignInRef.current,
            {
              opacity: 0,
              x: -25,
              duration: duration * 0.45,
            },
            0
          );

          tl.fromTo(
            introSignUpRef.current,
            { opacity: 0, x: 25 },
            {
              opacity: 1,
              x: 0,
              duration: duration * 0.55,
              onComplete: () => {
                if (introSignUpRef.current) {
                  introSignUpRef.current.style.pointerEvents = 'auto';
                }
                if (introSignInRef.current) {
                  introSignInRef.current.style.display = 'none';
                  introSignInRef.current.style.pointerEvents = 'none';
                }
              },
            },
            duration * 0.35
          );
        } else {
          // Switching to Sign-In (blade travels to the left)
          introSignInRef.current.style.display = 'flex';
          introSignInRef.current.style.pointerEvents = 'none';

          tl.to(
            introSignUpRef.current,
            {
              opacity: 0,
              x: 25,
              duration: duration * 0.45,
            },
            0
          );

          tl.fromTo(
            introSignInRef.current,
            { opacity: 0, x: -25 },
            {
              opacity: 1,
              x: 0,
              duration: duration * 0.55,
              onComplete: () => {
                if (introSignInRef.current) {
                  introSignInRef.current.style.pointerEvents = 'auto';
                }
                if (introSignUpRef.current) {
                  introSignUpRef.current.style.display = 'none';
                  introSignUpRef.current.style.pointerEvents = 'none';
                }
              },
            },
            duration * 0.35
          );
        }
      }

      // 3. Synchronize Form Panels (Ensuring inactive form is completely hidden)
      if (signUpFormRef.current && signInFormRef.current) {
        if (isToSignUp) {
          // Switching to Sign-Up:
          signUpFormRef.current.style.visibility = 'visible';
          signUpFormRef.current.style.pointerEvents = 'none';
          signInFormRef.current.style.pointerEvents = 'none';

          // Fade out Sign-In form swiftly as blade covers the right half
          tl.to(
            signInFormRef.current,
            {
              opacity: 0,
              x: 20,
              duration: duration * 0.4,
              onComplete: () => {
                if (signInFormRef.current) {
                  signInFormRef.current.style.visibility = 'hidden';
                }
              },
            },
            0
          );

          // Reveal Sign-Up form as blade clears the left half
          tl.fromTo(
            signUpFormRef.current,
            { opacity: 0, x: -20 },
            {
              opacity: 1,
              x: 0,
              duration: duration * 0.55,
            },
            duration * 0.35
          );
        } else {
          // Switching to Sign-In:
          signInFormRef.current.style.visibility = 'visible';
          signInFormRef.current.style.pointerEvents = 'none';
          signUpFormRef.current.style.pointerEvents = 'none';

          // Fade out Sign-Up form swiftly as blade covers the left half
          tl.to(
            signUpFormRef.current,
            {
              opacity: 0,
              x: -20,
              duration: duration * 0.4,
              onComplete: () => {
                if (signUpFormRef.current) {
                  signUpFormRef.current.style.visibility = 'hidden';
                }
              },
            },
            0
          );

          // Reveal Sign-In form as blade clears the right half
          tl.fromTo(
            signInFormRef.current,
            { opacity: 0, x: 20 },
            {
              opacity: 1,
              x: 0,
              duration: duration * 0.55,
            },
            duration * 0.35
          );
        }
      }
    }, containerRef);
  };

  // Synchronize when modeParam changes (via button click or browser Back/Forward)
  useEffect(() => {
    if (currentModeRef.current !== modeParam) {
      transitionToMode(modeParam);
    }
  }, [modeParam]);

  // Initial layout configuration without animation on mount
  useEffect(() => {
    const isSignUp = modeParam === 'signup';
    currentModeRef.current = modeParam;

    const ctx = gsap.context(() => {
      if (bladeRef.current) {
        gsap.set(bladeRef.current, {
          clipPath: isSignUp ? CLIP_SIGNUP : CLIP_SIGNIN,
        });
      }

      if (introSignInRef.current && introSignUpRef.current) {
        if (isSignUp) {
          gsap.set(introSignInRef.current, {
            opacity: 0,
            x: -25,
            display: 'none',
            pointerEvents: 'none',
          });
          gsap.set(introSignUpRef.current, {
            opacity: 1,
            x: 0,
            display: 'flex',
            pointerEvents: 'auto',
          });
        } else {
          gsap.set(introSignInRef.current, {
            opacity: 1,
            x: 0,
            display: 'flex',
            pointerEvents: 'auto',
          });
          gsap.set(introSignUpRef.current, {
            opacity: 0,
            x: 25,
            display: 'none',
            pointerEvents: 'none',
          });
        }
      }

      if (signUpFormRef.current && signInFormRef.current) {
        if (isSignUp) {
          gsap.set(signUpFormRef.current, {
            opacity: 1,
            x: 0,
            visibility: 'visible',
            pointerEvents: 'auto',
          });
          gsap.set(signInFormRef.current, {
            opacity: 0,
            x: 20,
            visibility: 'hidden',
            pointerEvents: 'none',
          });
        } else {
          gsap.set(signInFormRef.current, {
            opacity: 1,
            x: 0,
            visibility: 'visible',
            pointerEvents: 'auto',
          });
          gsap.set(signUpFormRef.current, {
            opacity: 0,
            x: -20,
            visibility: 'hidden',
            pointerEvents: 'none',
          });
        }
      }
    }, containerRef);

    return () => {
      if (activeTimelineRef.current) {
        activeTimelineRef.current.kill();
      }
      ctx.revert();
    };
  }, []); // Run once on mount

  // User-facing mode switch action with double-click guard
  const handleSwitchMode = (targetMode) => {
    if (isAnimatingRef.current) return;
    if (modeParam === targetMode) return;

    // Update URL query parameter — this cleanly drives the transition and browser history
    setSearchParams({ mode: targetMode });
  };

  // Validation Helpers
  const validatePassword = (pass) => {
    if (!pass) return 'Password is required.';
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    if (pass.length > 72) return 'Password cannot exceed 72 characters.';
    return null;
  };

  // Handle Sign In Submit
  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingSignIn) return;

    setSignInServerError(null);
    const errors = {};

    const emailErr = validateSignInEmail(signInEmail);
    if (emailErr) errors.email = emailErr;

    const passErr = validatePassword(signInPassword);
    if (passErr) errors.password = passErr;

    setSignInErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        setIsSubmittingSignIn(true);
        await login(signInEmail, signInPassword);
        setSignInPassword('');
        navigate('/dashboard');
      } catch (err) {
        setSignInServerError(err.message || 'Invalid email or password');
      } finally {
        setIsSubmittingSignIn(false);
      }
    }
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingSignUp) return;

    setSignUpServerError(null);
    const errors = {};

    if (!signUpName.trim() || signUpName.trim().length < 2) {
      errors.name = 'Full name is required (minimum 2 characters).';
    } else if (signUpName.trim().length > 70) {
      errors.name = 'Full name cannot exceed 70 characters.';
    }

    const emailErr = validateRegistrationEmail(signUpEmail);
    if (emailErr) errors.email = emailErr;

    const passErr = validatePassword(signUpPassword);
    if (passErr) errors.password = passErr;

    setSignUpErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        setIsSubmittingSignUp(true);
        await register(signUpName, signUpEmail, signUpPassword);
        setSignUpPassword('');
        navigate('/dashboard');
      } catch (err) {
        if (err.status === 409) {
          setSignUpServerError('An account with this email address already exists.');
        } else {
          setSignUpServerError(err.message || 'Failed to create student account.');
        }
      } finally {
        setIsSubmittingSignUp(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col justify-between transition-colors duration-200">
      {/* 1. TOP UTILITY HEADER (Autonomous Auth Bar) */}
      <header className="w-full border-b border-border bg-bg-page">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Back to SkillSync Link */}
          <Link
            to="/"
            className="inline-flex items-center text-xs sm:text-sm font-medium text-text-muted hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
            <span>Back to SkillSync</span>
          </Link>

          {/* Centered Wordmark */}
          <div className="flex items-center gap-1">
            <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-text-main">
              SkillSync
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="p-2 rounded-md border border-border bg-bg-card text-text-main hover:bg-bg-section transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* 2. AUTHENTICATION CONTAINER COMPOSITION */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div
          ref={containerRef}
          className="relative w-full max-w-4xl min-h-[620px] rounded-lg border border-border bg-bg-card shadow-restrained overflow-hidden flex flex-col md:flex-row transition-colors"
        >
          {/* ============================================================== */}
          {/* BASE LAYER: FORMS (Desktop 50/50 Grid; Mobile Single Column)    */}
          {/* ============================================================== */}

          {/* LEFT COLUMN: SIGN UP FORM (Visible on mobile when signup; always in DOM on desktop) */}
          <div
            ref={signUpFormRef}
            aria-hidden={modeParam !== 'signup'}
            style={{
              visibility: modeParam === 'signup' ? 'visible' : 'hidden',
              opacity: modeParam === 'signup' ? 1 : 0,
            }}
            className={`w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center overflow-hidden transition-colors ${
              modeParam === 'signup' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="max-w-sm mx-auto w-full space-y-6">
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-text-amber uppercase tracking-wider">
                  New Student Registration
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">
                  Create your student account
                </h1>
                <p className="text-xs text-text-muted leading-relaxed">
                  Join university collaboration tracks for projects, study groups, and skill exchanges.
                </p>
              </div>

              {/* Server error alert on submit */}
              {signUpServerError && (
                <div
                  role="alert"
                  className="rounded-md border border-border bg-bg-section p-3.5 text-xs text-text-main flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-text-amber shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-text-muted leading-relaxed font-medium">
                    {signUpServerError}
                  </p>
                </div>
              )}

              <form onSubmit={handleSignUpSubmit} noValidate className="space-y-4">
                <Input
                  id="signup-name"
                  label="Full Name"
                  placeholder="e.g. Alex Morgan"
                  value={signUpName}
                  onChange={(e) => {
                    setSignUpName(e.target.value);
                    if (signUpServerError) setSignUpServerError(null);
                    if (signUpErrors.name) setSignUpErrors((prev) => ({ ...prev, name: null }));
                  }}
                  error={signUpErrors.name}
                  required
                />

                <Input
                  id="signup-email"
                  type="email"
                  label="Email Address"
                  placeholder="name@example.com"
                  value={signUpEmail}
                  onChange={(e) => {
                    setSignUpEmail(e.target.value);
                    if (signUpServerError) setSignUpServerError(null);
                    if (signUpErrors.email) setSignUpErrors((prev) => ({ ...prev, email: null }));
                  }}
                  error={signUpErrors.email}
                  hint="Use an email address you can access."
                  required
                />

                <Input
                  id="signup-password"
                  type={showSignUpPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="At least 8 characters"
                  value={signUpPassword}
                  onChange={(e) => {
                    setSignUpPassword(e.target.value);
                    if (signUpServerError) setSignUpServerError(null);
                    if (signUpErrors.password) setSignUpErrors((prev) => ({ ...prev, password: null }));
                  }}
                  error={signUpErrors.password}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      aria-label={
                        showSignUpPassword ? 'Hide password' : 'Show password'
                      }
                      className="text-text-muted hover:text-text-main focus:outline-none p-1 rounded cursor-pointer"
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmittingSignUp}
                  className="w-full mt-2"
                >
                  {isSubmittingSignUp ? 'Creating Profile...' : 'Create Student Account'}
                </Button>
              </form>

              {/* Mobile Switch Action */}
              <div className="md:hidden pt-4 border-t border-border text-center">
                <p className="text-xs text-text-muted">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signin')}
                    className="font-medium text-text-main underline underline-offset-2 hover:text-text-amber focus:outline-none cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SIGN IN FORM (Visible on mobile when signin; always in DOM on desktop) */}
          <div
            ref={signInFormRef}
            aria-hidden={modeParam !== 'signin'}
            style={{
              visibility: modeParam === 'signin' ? 'visible' : 'hidden',
              opacity: modeParam === 'signin' ? 1 : 0,
            }}
            className={`w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center overflow-hidden transition-colors ${
              modeParam === 'signin' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="max-w-sm mx-auto w-full space-y-6">
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-text-amber uppercase tracking-wider">
                  Student Sign In
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">
                  Welcome back
                </h1>
                <p className="text-xs text-text-muted leading-relaxed">
                  Sign in to manage your student profile, view recommendations, and track collaboration requests.
                </p>
              </div>

              {/* Server error alert on submit */}
              {signInServerError && (
                <div
                  role="alert"
                  className="rounded-md border border-border bg-bg-section p-3.5 text-xs text-text-main flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-text-amber shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-text-muted leading-relaxed font-medium">
                    {signInServerError}
                  </p>
                </div>
              )}

              <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
                <Input
                  id="signin-email"
                  type="email"
                  label="Email Address"
                  placeholder="name@example.com"
                  value={signInEmail}
                  onChange={(e) => {
                    setSignInEmail(e.target.value);
                    if (signInServerError) setSignInServerError(null);
                    if (signInErrors.email) setSignInErrors((prev) => ({ ...prev, email: null }));
                  }}
                  error={signInErrors.email}
                  required
                />

                <Input
                  id="signin-password"
                  type={showSignInPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => {
                    setSignInPassword(e.target.value);
                    if (signInServerError) setSignInServerError(null);
                    if (signInErrors.password) setSignInErrors((prev) => ({ ...prev, password: null }));
                  }}
                  error={signInErrors.password}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      aria-label={
                        showSignInPassword ? 'Hide password' : 'Show password'
                      }
                      className="text-text-muted hover:text-text-main focus:outline-none p-1 rounded cursor-pointer"
                    >
                      {showSignInPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmittingSignIn}
                  className="w-full mt-2"
                >
                  {isSubmittingSignIn ? 'Signing In...' : 'Sign In to SkillSync'}
                </Button>
              </form>

              {/* Mobile Switch Action */}
              <div className="md:hidden pt-4 border-t border-border text-center">
                <p className="text-xs text-text-muted">
                  New to SkillSync?{' '}
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signup')}
                    className="font-medium text-text-main underline underline-offset-2 hover:text-text-amber focus:outline-none cursor-pointer"
                  >
                    Create student profile
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* OVERLAY LAYER: GSAP ANIMATED DIAGONAL BLADE (Desktop only)       */}
          {/* ============================================================== */}
          <div
            ref={bladeRef}
            className="hidden md:block absolute inset-0 z-20 pointer-events-none bg-primary dark:bg-bg-section text-primary-foreground dark:text-text-main transition-colors duration-200"
          >
            {/* INTRO CONTENT FOR SIGN-IN MODE (Left half container) */}
            <div
              ref={introSignInRef}
              className="absolute inset-y-0 left-0 w-1/2 p-10 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-accent" aria-hidden="true" />
                <span className="font-serif text-sm font-semibold tracking-wide uppercase">
                  SkillSync Academic
                </span>
              </div>

              <div className="space-y-4 max-w-xs">
                <h2 className="font-serif text-3xl font-medium tracking-tight leading-tight">
                  Collaborate with purpose.
                </h2>
                <p className="text-xs leading-relaxed text-primary-foreground/80 dark:text-text-muted">
                  Connect with vetted university students for capstone projects,
                  homework study groups, and reciprocal skill exchanges.
                </p>
              </div>

              <div className="space-y-2 pt-4">
                <span className="text-[11px] block uppercase tracking-wider text-primary-foreground/70 dark:text-text-muted">
                  Don&apos;t have an account?
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signup')}
                  className="pointer-events-auto inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-md border border-primary-foreground/30 dark:border-border text-primary-foreground dark:text-text-main hover:bg-primary-foreground/10 dark:hover:bg-bg-card transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  Create student profile
                </button>
              </div>
            </div>

            {/* INTRO CONTENT FOR SIGN-UP MODE (Right half container) */}
            <div
              ref={introSignUpRef}
              className="absolute inset-y-0 right-0 w-1/2 p-10 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 justify-end">
                <span className="font-serif text-sm font-semibold tracking-wide uppercase">
                  SkillSync Academic
                </span>
                <GraduationCap className="w-5 h-5 text-accent" aria-hidden="true" />
              </div>

              <div className="space-y-4 max-w-xs ml-auto text-right">
                <h2 className="font-serif text-3xl font-medium tracking-tight leading-tight">
                  Welcome to the network.
                </h2>
                <p className="text-xs leading-relaxed text-primary-foreground/80 dark:text-text-muted">
                  Set up your profile to match on technical competencies,
                  course schedules, and symmetrical learning goals.
                </p>
              </div>

              <div className="space-y-2 pt-4 text-right">
                <span className="text-[11px] block uppercase tracking-wider text-primary-foreground/70 dark:text-text-muted">
                  Already registered?
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signin')}
                  className="pointer-events-auto inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-md border border-primary-foreground/30 dark:border-border text-primary-foreground dark:text-text-main hover:bg-primary-foreground/10 dark:hover:bg-bg-card transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ml-auto"
                >
                  Sign in to account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. MINIMAL AUTH FOOTER */}
      <footer className="w-full border-t border-border bg-bg-page py-4 text-center text-xs text-text-muted">
        <span>SkillSync © 2026. Higher Education Student Collaboration.</span>
      </footer>
    </div>
  );
}

export default AuthPage;
