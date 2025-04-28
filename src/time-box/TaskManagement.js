// TaskManagement.js
import React, { useState, useEffect, useRef } from "react";
import { 
  FaPlus, 
  FaTrash, 
  FaCheck, 
  FaPlay, 
  FaPause, 
  FaRedo, 
  FaTasks 
} from "react-icons/fa";
import "./TaskManagement.css"; // Create this file for custom styles if desired

export default function TaskManagement() {
  // State to control the visibility of the task management tab
  const [showTab, setShowTab] = useState(false);
  const toggleTab = () => setShowTab(!showTab);

  // ----- TO‑DO LIST STATE & HANDLERS -----
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    if (newTask.trim() === "") return;
    const task = { text: newTask.trim(), completed: false, id: Date.now() };
    setTasks([...tasks, task]);
    setNewTask("");
  };

  const toggleTaskCompleted = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  // ----- POMODORO TIMER STATE & HANDLERS -----
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes focus session
  const [isBreak, setIsBreak] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Automatically switch modes when the timer finishes
            if (!isBreak) {
              setIsBreak(true);
              return 5 * 60; // 5 minutes break
            } else {
              setIsBreak(false);
              return 25 * 60; // Reset to 25 minutes focus
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, isBreak]);

  const handleStart = () => {
    if (!isRunning) setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
  };

  const handleReset = () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  return (
    <div className="task-management-container">
      <h2 
        className="section-title" 
        onClick={toggleTab} 
        style={{ cursor: "pointer" }}
        title="Toggle Task Management & Productivity"
      >
        <FaTasks style={{ marginRight: "8px" }} />
        Task Management &amp; Productivity
      </h2>
      
      {showTab && (
        <div>
          {/* ----- TASK LIST SECTION ----- */}
          <div className="task-section">
            <h3>To‑Do List</h3>
            <div className="task-input">
              <input
                type="text"
                placeholder="Enter a new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button onClick={handleAddTask} title="Add Task">
                <FaPlus />
              </button>
            </div>
            <ul className="task-list">
              {tasks.map((task) => (
                <li key={task.id} className={task.completed ? "completed" : ""}>
                  <span onClick={() => toggleTaskCompleted(task.id)}>
                    {task.completed ? (
                      <FaCheck style={{ color: "green", marginRight: "5px" }} />
                    ) : (
                      <span className="checkbox-placeholder" />
                    )}
                    {task.text}
                  </span>
                  <button 
                    className="remove-btn" 
                    onClick={() => removeTask(task.id)}
                    title="Remove Task"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ----- POMODORO TIMER SECTION ----- */}
          <div className="pomodoro-section">
            <h3>Pomodoro Timer</h3>
            <div className="timer-display">{formatTime(timeLeft)}</div>
            <div className="timer-controls">
              {!isRunning ? (
                <button onClick={handleStart} title="Start Timer">
                  <FaPlay style={{ marginRight: "5px" }} />
                  Start
                </button>
              ) : (
                <button onClick={handlePause} title="Pause Timer">
                  <FaPause style={{ marginRight: "5px" }} />
                  Pause
                </button>
              )}
              <button onClick={handleReset} title="Reset Timer">
                <FaRedo style={{ marginRight: "5px" }} />
                Reset
              </button>
            </div>
            <div className="timer-mode">
              Current Mode: <strong>{isBreak ? "Break" : "Focus"}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
