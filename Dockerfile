FROM docker:dind

# Install dependencies
RUN apk add --no-cache \
    nodejs npm \
    python3 py3-pip curl bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/root/.bun/bin:${PATH}"

# Install uvicorn (use --break-system-packages for Docker isolation)
RUN pip3 install --break-system-packages uvicorn

# Setup aliases
RUN echo "alias uv='uvicorn'" >> ~/.bashrc
RUN echo "alias bunx='bun x'" >> ~/.bashrc

CMD ["bash"]
