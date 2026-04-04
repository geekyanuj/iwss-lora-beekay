import { useFormik } from "formik";
import { useNavigate } from "react-router";

function LoginPage() {
  const navigate = useNavigate();
  const formik = useFormik({
    initialValues: {
      username: "",
      password: "",
    },
    onSubmit: (values) => {
      if (values.password === "water@123" && values.username === "water") {
        localStorage.setItem("logged-in", "true");
        navigate("/");
      } else {
        formik.setFieldError("username", "error");
      }
    },
  });
  return (
    <div className="h-screen flex items-center bg-gray-100 transition-colors duration-300">
      <div className="items-center">
        <div className="max-w-2/4 mx-auto grid md:grid-cols-2 rounded-4xl gap-8 bg-white transition-colors duration-300">
          <div className="p-8 flex items-center rounded-4xl bg-gray-50 transition-colors duration-300">
            <img className="" src="/beekay_logo.png" alt="Beekay" />
          </div>
          <div className="flex flex-col items-center m-8  ">
            <div className="items-center p-4">
              <h2 className="text-2xl font-bold text-gray-900 transition-colors duration-300">Login to your account </h2>
            </div>
            <form onSubmit={formik.handleSubmit} className="m-4 w-full">
              <div className="mb-5">
                <label
                  htmlFor="username"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  onChange={formik.handleChange}
                  value={formik.values.username}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
                <div className="text-xs text-red-600">
                  {formik.errors.username ? "Invalid username or password" : ""}
                </div>
              </div>
              <div className="mb-5">
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  onChange={formik.handleChange}
                  value={formik.values.password}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div className="flex items-start mb-5">
                <div className="flex items-center h-5">
                  <input
                    id="remember"
                    type="checkbox"
                    value=""
                    className="w-4 h-4 border border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-blue-300"
                  />
                </div>
                <label
                  htmlFor="remember"
                  className="ms-2 text-sm font-medium text-gray-900"
                >
                  Remember me
                </label>
              </div>
              <button
                type="submit"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
              >
                Login
              </button>
            </form>
          </div>
        </div>
        <div className="flex flex-row w-full justify-center p-8">
          <div className="flex flex-col items-center">
            <img
              className="h-auto w-20 rounded-lg pt-1 pl-1 pr-1"
              src="/tetech-logo.png"
              alt="TE"
              title="Powered by TE TECH SOLUTION"
            />

            <h5 className="text-gray-500 mt-2">Powered by TE TECH SOLUTION</h5>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
